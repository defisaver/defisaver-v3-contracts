const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    WETH_ADDRESS,
    impersonateAccount,
    AWETH_ADDR,
    nullAddress,
    AAVE_MARKET,
    ALINK_ADDR,
    LINK_ADDR,
    USDT_ADDR,
    BUSD_ADDR,
    sendEther,
    AWBTC_ADDR,
    WBTC_ADDR,
    balanceOf,
    DAI_ADDR,
    resetForkToBlock,
    AUNI_ADDR,
    ADAI_ADDR,
    UNI_ADDR,
} = require('../../utils');
const { executeAction } = require('../../actions');

const instAaveDebtShiftTest = async () => {
    describe('Inst Aave position shift', function () {
        this.timeout(80000);

        let proxy;
        let ownerAcc;
        let dydxFlAddr;
        let flMaker;

        /// @notice run on block number 13172393
        before(async () => {
            await resetForkToBlock(13172393);
            await redeploy('InstPullTokens');
            await redeploy('AaveCollateralSwitch');
            await redeploy('TokenBalance');
            await redeploy('FLDyDx');
            await redeploy('AaveSupply');
            await redeploy('AaveBorrow');
            await redeploy('AavePayback');
            flMaker = await redeploy('FLMaker');
            await redeploy('SendToken');
            await redeploy('TaskExecutor');
            dydxFlAddr = await getAddrFromRegistry('FLDyDx');
        });

        it('... Migrate aave position from INST (COLL : WETH, WBTC | DEBT : USDT)', async () => {
            const OWNER_ACC = '0x2Ee8670d2b936985D5fb1EE968810c155D3bB9cA';
            const dsaAddress = '0x63bf1D484d7D799722b1BA9c91f5ffa6d416D60A';
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

            /*
        const flashloanAction = new dfs.actions.flashloan.DyDxFlashLoanAction(
            hre.ethers.utils.parseUnits('1000', 18),
            WETH_ADDRESS,
            nullAddress,
            [],
        );
    */
            const flashloanAction = new dfs.actions.flashloan.MakerFlashLoanAction(
                hre.ethers.utils.parseUnits('1000000', 18),
                nullAddress,
                [],
            );
            const balanceCheckerActionUSDT = new dfs.actions.basic.TokenBalanceAction(
                '0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', // VARIABLE DEBT USDT
                dsaAddress,
            );
            // supply eth to aave
            const aaveSupplyAction = new dfs.actions.aave.AaveSupplyAction(
                AAVE_MARKET,
                DAI_ADDR,
                '$1',
                proxy.address,
                nullAddress,
                true,
            );
            const aaveBorrowActionUSDT = new dfs.actions.aave.AaveBorrowAction(
                AAVE_MARKET,
                USDT_ADDR,
                '$2',
                2,
                proxy.address,
                nullAddress,
            );
            const aaveRepayActionUSDT = new dfs.actions.aave.AavePaybackAction(
                AAVE_MARKET,
                USDT_ADDR,
                '$2',
                2,
                proxy.address,
                dsaAddress,
            );
            const instTokenPullAction = new dfs.actions.insta.InstPullTokensAction(
                dsaAddress,
                [AWETH_ADDR, AWBTC_ADDR],
                [
                    hre.ethers.constants.MaxUint256,
                    hre.ethers.constants.MaxUint256,
                ],
                proxy.address,
            );
            const aaveSetAsCollateral = new dfs.actions.aave.AaveCollateralSwitchAction(
                '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
                [WBTC_ADDR, WETH_ADDRESS],
                [true, true],
            );
            // withdraw flashloan eth
            const aaveWithdrawAction = new dfs.actions.aave.AaveWithdrawAction(
                AAVE_MARKET,
                DAI_ADDR,
                '$1',
                flMaker.address,
            );
            // repay flashloan
            const transferRecipe = new dfs.Recipe('TransferAavePositionFromInstadapp', [
                flashloanAction,
                balanceCheckerActionUSDT,
                aaveSupplyAction,
                aaveBorrowActionUSDT,
                aaveRepayActionUSDT,
                instTokenPullAction,
                aaveSetAsCollateral,
                aaveWithdrawAction,
            ]);
            const functionData = transferRecipe.encodeForDsProxyCall();

            const usdtDebtAmount = await balanceOf('0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', dsaAddress);
            const wbtcCollAmount = await balanceOf(AWBTC_ADDR, dsaAddress);
            const wethCollAmount = await balanceOf(AWETH_ADDR, dsaAddress);

            await executeAction('TaskExecutor', functionData[1], impersonatedProxy);
            const usdtDebtAmountAfter = await balanceOf('0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', proxy.address);
            const wbtcCollAmountAfter = await balanceOf(AWBTC_ADDR, proxy.address);
            const wethCollAmountAfter = await balanceOf(AWETH_ADDR, proxy.address);

            expect(wbtcCollAmount).to.be.lte(wbtcCollAmountAfter);
            expect(wethCollAmount).to.be.lte(wethCollAmountAfter);
            console.log(usdtDebtAmount);
            console.log(usdtDebtAmountAfter);
        }).timeout(1000000);
        it('... Migrate aave position from INST (COLL : WETH, LINK | DEBT : USDT, BUSD) ', async () => {
            const OWNER_ACC = '0xb5fDB9c33C4EbbF020eDE0138EdE8d7563dFe71A';
            const dsaAddress = '0x2E15905711635118da35D5aB9a0f994f2cfb304C';
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

            const flashloanAction = new dfs.actions.flashloan.DyDxFlashLoanAction(
                hre.ethers.utils.parseUnits('1000', 18),
                WETH_ADDRESS,
                nullAddress,
                [],
            );
            const balanceCheckerActionBUSD = new dfs.actions.basic.TokenBalanceAction(
                '0xbA429f7011c9fa04cDd46a2Da24dc0FF0aC6099c', // VARIABLE DEBT BUSD
                dsaAddress,
            );
            const balanceCheckerActionUSDT = new dfs.actions.basic.TokenBalanceAction(
                '0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', // VARIABLE DEBT USDT
                dsaAddress,
            );
            // supply eth to aave
            const aaveSupplyAction = new dfs.actions.aave.AaveSupplyAction(
                AAVE_MARKET,
                WETH_ADDRESS,
                '$1',
                proxy.address,
                nullAddress,
                true,
            );
            // borrow enough to payback dsa debt
            const aaveBorrowActionBUSD = new dfs.actions.aave.AaveBorrowAction(
                AAVE_MARKET,
                BUSD_ADDR,
                '$2',
                2,
                proxy.address,
                nullAddress,
            );
            const aaveBorrowActionUSDT = new dfs.actions.aave.AaveBorrowAction(
                AAVE_MARKET,
                USDT_ADDR,
                '$3',
                2,
                proxy.address,
                nullAddress,
            );
            // repay dsa debt
            const aaveRepayActionBUSD = new dfs.actions.aave.AavePaybackAction(
                AAVE_MARKET,
                BUSD_ADDR,
                '$2',
                2,
                proxy.address,
                dsaAddress,
            );
            const aaveRepayActionUSDT = new dfs.actions.aave.AavePaybackAction(
                AAVE_MARKET,
                USDT_ADDR,
                '$3',
                2,
                proxy.address,
                dsaAddress,
            );
            const instTokenPullAction = new dfs.actions.insta.InstPullTokensAction(
                dsaAddress,
                [ALINK_ADDR, AWETH_ADDR],
                [
                    hre.ethers.constants.MaxUint256,
                    hre.ethers.constants.MaxUint256,
                ],
                proxy.address,
            );
            const aaveSetAsCollateral = new dfs.actions.aave.AaveCollateralSwitchAction(
                '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
                [LINK_ADDR, WETH_ADDRESS],
                [true, true],
            );
            // withdraw flashloan eth
            // repay flashloan
            const aaveWithdrawAction = new dfs.actions.aave.AaveWithdrawAction(
                AAVE_MARKET,
                WETH_ADDRESS,
                '$1',
                dydxFlAddr,
            );
            const transferRecipe = new dfs.Recipe('TransferDebtlessAaveFromInstadapp', [
                flashloanAction,
                balanceCheckerActionBUSD,
                balanceCheckerActionUSDT,
                aaveSupplyAction,
                aaveBorrowActionBUSD,
                aaveBorrowActionUSDT,
                aaveRepayActionBUSD,
                aaveRepayActionUSDT,
                instTokenPullAction,
                aaveSetAsCollateral,
                aaveWithdrawAction,
            ]);
            const functionData = transferRecipe.encodeForDsProxyCall();

            const busdDebtAmount = await balanceOf('0xbA429f7011c9fa04cDd46a2Da24dc0FF0aC6099c', dsaAddress);
            const usdtDebtAmount = await balanceOf('0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', dsaAddress);
            const linkCollAmount = await balanceOf(ALINK_ADDR, dsaAddress);
            const wethCollAmount = await balanceOf(AWETH_ADDR, dsaAddress);
            await executeAction('TaskExecutor', functionData[1], impersonatedProxy);
            const busdDebtAmountAfter = await balanceOf('0xbA429f7011c9fa04cDd46a2Da24dc0FF0aC6099c', proxy.address);
            const usdtDebtAmountAfter = await balanceOf('0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec', proxy.address);
            const linkCollAmountAfter = await balanceOf(ALINK_ADDR, proxy.address);
            const wethCollAmountAfter = await balanceOf(AWETH_ADDR, proxy.address);
            expect(linkCollAmount).to.be.lte(linkCollAmountAfter);
            expect(wethCollAmount).to.be.lte(wethCollAmountAfter);
            console.log(usdtDebtAmount);
            console.log(usdtDebtAmountAfter);
            console.log(busdDebtAmount);
            console.log(busdDebtAmountAfter);
        }).timeout(1000000);
    });
};
const instAaveNoDebtShiftTest = async () => {
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
};
const instCompDebtShiftTest = async () => {
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
};
const fullInstRecipesTest = async () => {
    await instAaveDebtShiftTest();
    await instAaveNoDebtShiftTest();
    await instCompDebtShiftTest();
};
module.exports = {
    fullInstRecipesTest,
    instCompDebtShiftTest,
    instAaveNoDebtShiftTest,
    instAaveDebtShiftTest,
};
