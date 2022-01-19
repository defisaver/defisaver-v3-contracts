const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    WETH_ADDRESS,
    impersonateAccount,
    balanceOf,
    sendEther,
    nullAddress,
    resetForkToBlock,
} = require('../../utils');
const { executeAction } = require('../../actions');

describe('Inst Compound position shift', function () {
    this.timeout(80000);

    let proxy;
    let ownerAcc;
    let dydxFlAddr;

    /// @notice run on block number #13229894

    before(async () => {
        await resetForkToBlock(13229894);
        await redeploy('InstPullTokens');
        await redeploy('CompCollateralSwitch');
        await redeploy('TokenBalance');
        await redeploy('FLDyDx');
        await redeploy('CompGetDebt');
        await redeploy('CompBorrow');
        await redeploy('CompPayback');
        await redeploy('CompSupply');
        await redeploy('CompWithdraw');
        dydxFlAddr = await getAddrFromRegistry('FLDyDx');
    });
    it('... Migrate Comp position from INST (COLL : COMP, UNI | DEBT : DAI, USDC)', async () => {
        const OWNER_ACC = '0x9488B8F6BcB897314bcB4Fd986C7C39dc26Dc51f';
        const dsaAddress = '0x2BC853B03481F0EA9e7a02D8E92fDC446f1966C6';
        const dsaContract = await hre.ethers.getContractAt('IInstaAccountV2', dsaAddress);
        sendEther((await hre.ethers.getSigners())[0], OWNER_ACC, '10');
        proxy = await getProxy(OWNER_ACC);
        // Approve dsproxy to have authoritiy over DSA account!
        await impersonateAccount(OWNER_ACC);
        ownerAcc = await hre.ethers.provider.getSigner(OWNER_ACC);
        const dsaContractImpersonated = await dsaContract.connect(ownerAcc);
        const ABI = [
            'function add(address)',
        ];
        const iface = new hre.ethers.utils.Interface(ABI);
        const data = iface.encodeFunctionData('add', [proxy.address]);
        await dsaContractImpersonated.cast(['AUTHORITY-A'], [data], OWNER_ACC);
        // create recipe
        const impersonatedProxy = proxy.connect(ownerAcc);
        // flashloan enough to repay all debt
        const CDAI_ADDR = '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643';
        const CUSDC_ADDR = '0x39aa39c021dfbae8fac545936693ac917d5e7563';
        const CETH_ADDR = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
        const CCOMP_ADDR = '0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4';
        const CUNI_ADDR = '0x35A18000230DA775CAc24873d00Ff85BccdeD550';

        const flashloanAction = new dfs.actions.flashloan.DyDxFlashLoanAction(
            hre.ethers.utils.parseUnits('5000', 18),
            WETH_ADDRESS,
            nullAddress,
            [],
        );
        const daiCompGetDebtAction = new dfs.actions.compound.CompoundGetDebtAction(
            CDAI_ADDR,
            dsaAddress,
        );
        const usdcCompGetDebtAction = new dfs.actions.compound.CompoundGetDebtAction(
            CUSDC_ADDR,
            dsaAddress,
        );
        const supplyCompAction = new dfs.actions.compound.CompoundSupplyAction(
            CETH_ADDR,
            '$1',
            proxy.address,
        );
        const compBorrowDaiAction = new dfs.actions.compound.CompoundBorrowAction(
            CDAI_ADDR,
            '$2',
            proxy.address,
        );
        const compBorrowUsdcAction = new dfs.actions.compound.CompoundBorrowAction(
            CUSDC_ADDR,
            '$3',
            proxy.address,
        );
        const compPaybackDaiAction = new dfs.actions.compound.CompoundPaybackAction(
            CDAI_ADDR,
            '$2',
            proxy.address,
            dsaAddress,
        );
        const compPaybackUsdcAction = new dfs.actions.compound.CompoundPaybackAction(
            CUSDC_ADDR,
            '$3',
            proxy.address,
            dsaAddress,
        );
        const instTokenPullAction = new dfs.actions.insta.InstPullTokensAction(
            dsaAddress,
            [CCOMP_ADDR, CUNI_ADDR],
            [
                hre.ethers.constants.MaxUint256,
                hre.ethers.constants.MaxUint256,
            ],
            proxy.address,
        );
        const compCollSwitchAction = new dfs.actions.compound.CompoundCollateralSwitchAction(
            [CCOMP_ADDR, CUNI_ADDR],
            [true, true],
        );
        const compWithdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
            CETH_ADDR,
            '$1',
            dydxFlAddr,
        );
        // repay flashloan
        const transferRecipe = new dfs.Recipe('TransferCompoundPositionFromInstadapp', [
            flashloanAction,
            // find debt balances
            daiCompGetDebtAction,
            usdcCompGetDebtAction,
            // supply eth to compound position
            supplyCompAction,
            // borrow debt balances
            compBorrowDaiAction,
            compBorrowUsdcAction,
            // repay debt on dsa
            compPaybackDaiAction,
            compPaybackUsdcAction,
            instTokenPullAction,
            // switch collateral compound
            compCollSwitchAction,
            // repay flashloan
            compWithdrawAction,
        ]);
        const functionData = transferRecipe.encodeForDsProxyCall();

        const cCompDSABalanceBefore = await balanceOf(CCOMP_ADDR, dsaAddress);
        const cUNIDSABalanceBefore = await balanceOf(CUNI_ADDR, dsaAddress);

        await executeAction('TaskExecutor', functionData[1], impersonatedProxy);

        const cCompProxyBalanceAfter = await balanceOf(CCOMP_ADDR, proxy.address);
        const cUNIProxyBalanceAfter = await balanceOf(CUNI_ADDR, proxy.address);
        expect(cCompDSABalanceBefore).to.be.eq(cCompProxyBalanceAfter);
        expect(cUNIDSABalanceBefore).to.be.eq(cUNIProxyBalanceAfter);
    }).timeout(1000000);
});
