const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    getProxy,
    redeploy,
    WETH_ADDRESS,
    impersonateAccount,
    balanceOf,
    DAI_ADDR,
    AUNI_ADDR,
    AWETH_ADDR,
    ADAI_ADDR,
    UNI_ADDR,
    resetForkToBlock,
} = require('../../utils');
const { executeAction } = require('../../actions');

describe('Inst Aave debtless position shift', function () {
    this.timeout(80000);

    let proxy;
    let ownerAcc;
    let dsaContract;
    let dsaAddress;

    /// @notice run on block number 12805354

    const OWNER_ACC = '0x6F6c0194A67c2727c61370e76042B3D92F3AC35E';
    before(async () => {
        await resetForkToBlock(12805354);

        await redeploy('InstPullTokens');
        await redeploy('AaveCollateralSwitch');

        dsaAddress = '0xe9BEE24323AaAd3792836005a1Cb566C72B3FaD3';
        dsaContract = await hre.ethers.getContractAt('IInstaAccountV2', dsaAddress);
    });
    it('... Migrate aave debtless position from INST ', async () => {
        // Approve dsproxy to have authoritiy over DSA account!
        await impersonateAccount(OWNER_ACC);
        ownerAcc = await hre.ethers.provider.getSigner(OWNER_ACC);
        const dsaContractImpersonated = dsaContract.connect(ownerAcc);
        const ABI = [
            'function add(address)',
        ];
        const iface = new hre.ethers.utils.Interface(ABI);
        const data = iface.encodeFunctionData('add', [OWNER_ACC]);
        await dsaContractImpersonated.cast(['AUTHORITY-A'], [data], OWNER_ACC);

        // create recipe
        proxy = await getProxy(OWNER_ACC);
        const impersonatedProxy = proxy.connect(ownerAcc);

        const instTokenPullAction = new dfs.actions.insta.InstPullTokensAction(
            dsaAddress,
            [AUNI_ADDR, AWETH_ADDR, ADAI_ADDR],
            [
                hre.ethers.constants.MaxUint256,
                hre.ethers.constants.MaxUint256,
                hre.ethers.constants.MaxUint256,
            ],
            proxy.address,
        );
        const aaveSetAsCollateral = new dfs.actions.aave.AaveCollateralSwitchAction(
            '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
            [UNI_ADDR, WETH_ADDRESS, DAI_ADDR],
            [true, true, true],
        );
        const transferRecipe = new dfs.Recipe('TransferDebtlessAavePositionFromInstadapp', [
            instTokenPullAction,
            aaveSetAsCollateral,
        ]);
        const functionData = transferRecipe.encodeForDsProxyCall();

        const aUniBalanceBefore = await balanceOf(AUNI_ADDR, proxy.address);
        const aWethBalanceBefore = await balanceOf(AWETH_ADDR, proxy.address);
        const aDaiBalanceBefore = await balanceOf(ADAI_ADDR, proxy.address);

        await executeAction('TaskExecutor', functionData[1], impersonatedProxy);

        const aUniBalanceAfter = await balanceOf(AUNI_ADDR, proxy.address);
        const aWethBalanceAfter = await balanceOf(AWETH_ADDR, proxy.address);
        const aDaiBalanceAfter = await balanceOf(ADAI_ADDR, proxy.address);
        expect(aUniBalanceAfter).to.be.gt(aUniBalanceBefore);
        expect(aWethBalanceAfter).to.be.gt(aWethBalanceBefore);
        expect(aDaiBalanceAfter).to.be.gt(aDaiBalanceBefore);
    });
});
