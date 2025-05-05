/* eslint-disable no-await-in-loop */
const hre = require('hardhat');
const { expect } = require('chai');
const dfs = require('@defisaver/sdk');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot,
    revertToSnapshot,
    getProxy,
    redeploy,
    setBalance,
    approve,
    nullAddress,
    formatMockExchangeObj,
    setNewExchangeWrapper,
    balanceOf,
    resetForkToBlock,
    getAddrFromRegistry,
} = require('../../utils/utils');
const { morphoBlueSupplyCollateral, morphoBlueBorrow, executeAction } = require('../../utils/actions');

describe('Morpho-Blue-Repay', function () {
    this.timeout(80000);

    // PT-sUSDE-29May2025/DAI LLTV 91.5%
    const morphoMarketParams = [
        '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        '0xb7de5dFCb74d25c2f21841fbd6230355C50d9308',
        '0xE84f7e0a890e5e57d0beEa2c8716dDf0c9846B4A',
        '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
        '915000000000000000',
    ];
    // Pendle market information
    const pendleMarket = '0xB162B764044697cf03617C2EFbcB1f42e31E4766';
    const pendleUnderlying = '0x9d39a5de30e57443bff2a8307a4256c8797a3497';
    const syToken = '0xe877b2a8a53763c8b0534a15e87da28f3ac1257e';

    let senderAcc;
    let proxy;
    let snapshot;
    let view;
    let mockWrapper;

    const openMorphoBluePosition = async (collAmount, debtAmount) => {
        const collToken = morphoMarketParams[1];
        await setBalance(collToken, senderAcc.address, collAmount);
        await approve(collToken, proxy.address, senderAcc);
        await morphoBlueSupplyCollateral(
            proxy, morphoMarketParams, collAmount, senderAcc.address, nullAddress,
        );
        await morphoBlueBorrow(
            proxy, morphoMarketParams, debtAmount, nullAddress, senderAcc.address,
        );
    };

    const validateNoTokensLeftOnProxy = async () => {
        const proxyUnderlyingBalance = await balanceOf(pendleUnderlying, proxy.address);
        const proxySyBalance = await balanceOf(syToken, proxy.address);
        const proxyLoanTokenBalance = await balanceOf(morphoMarketParams[0], proxy.address);
        const proxyCollTokenBalance = await balanceOf(morphoMarketParams[1], proxy.address);

        expect(proxyUnderlyingBalance).to.be.eq(0);
        expect(proxySyBalance).to.be.eq(0);
        expect(proxyLoanTokenBalance).to.be.eq(0);
        expect(proxyCollTokenBalance).to.be.eq(0);
    };

    before(async () => {
        await resetForkToBlock(22404847);
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await redeploy('MorphoBlueSupplyCollateral');
        await redeploy('MorphoBlueBorrow');
        await redeploy('MorphoBlueWithdrawCollateral');
        await redeploy('MorphoBluePayback');
        await redeploy('PendleTokenUnwrap');
        view = await (await hre.ethers.getContractFactory('MorphoBlueView')).deploy();
        mockWrapper = await redeploy('MockExchangeWrapper');
        await setNewExchangeWrapper(senderAcc, mockWrapper.address);
    });

    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });

    it('should do a repay for MorphoBlue PT-sUSDE-29May2025/DAI position', async () => {
        const collAmount = hre.ethers.utils.parseUnits('50000', 18);
        const debtAmount = hre.ethers.utils.parseUnits('15000', 18);
        await openMorphoBluePosition(collAmount, debtAmount);

        const ratioBefore = await view.callStatic.getRatioUsingParams(
            morphoMarketParams,
            proxy.address,
        );
        console.log('Ratio before repay', ratioBefore);

        const pendleUnderlyingInfo = getAssetInfoByAddress(pendleUnderlying);
        const loanTokenInfo = getAssetInfoByAddress(morphoMarketParams[0]);

        const repayAmount = collAmount.div(10);
        const withdrawAction = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
            morphoMarketParams[0],
            morphoMarketParams[1],
            morphoMarketParams[2],
            morphoMarketParams[3],
            morphoMarketParams[4],
            repayAmount,
            nullAddress,
            proxy.address,
        );
        const unwrapPtTokensAction = new dfs.actions.pendle.PendleTokenUnwrapAction(
            pendleMarket,
            pendleUnderlying,
            morphoMarketParams[1],
            proxy.address,
            proxy.address,
            repayAmount,
            1,
        );
        const sellAction = new dfs.actions.basic.SellAction(
            await formatMockExchangeObj(
                pendleUnderlyingInfo,
                loanTokenInfo,
                '$2',
            ),
            proxy.address,
            proxy.address,
        );
        const paybackAction = new dfs.actions.morphoblue.MorphoBluePaybackAction(
            morphoMarketParams[0],
            morphoMarketParams[1],
            morphoMarketParams[2],
            morphoMarketParams[3],
            morphoMarketParams[4],
            '$3',
            proxy.address,
            nullAddress,
        );
        const repayRecipe = new dfs.Recipe('RepayRecipe', [
            withdrawAction,
            unwrapPtTokensAction,
            sellAction,
            paybackAction,
        ]);
        const functionData = repayRecipe.encodeForDsProxyCall();

        await executeAction('RecipeExecutor', functionData[1], proxy);

        const ratioAfter = await view.callStatic.getRatioUsingParams(
            morphoMarketParams,
            proxy.address,
        );
        console.log('Ratio after repay', ratioAfter);
        expect(ratioBefore).to.be.lt(ratioAfter);

        await validateNoTokensLeftOnProxy();
    });
    it('should do a flashloan repay for MorphoBlue PT-sUSDE-29May2025/DAI position', async () => {
        const collAmount = hre.ethers.utils.parseUnits('50000', 18);
        const debtAmount = hre.ethers.utils.parseUnits('15000', 18);
        await openMorphoBluePosition(collAmount, debtAmount);

        const ratioBefore = await view.callStatic.getRatioUsingParams(
            morphoMarketParams,
            proxy.address,
        );
        console.log('Ratio before repay', ratioBefore);

        const pendleUnderlyingInfo = getAssetInfoByAddress(pendleUnderlying);
        const loanTokenInfo = getAssetInfoByAddress(morphoMarketParams[0]);

        const repayAmount = collAmount.div(10);

        // PT token flashloan from MorphoBlue
        const flAction = new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.MorphoBlueFlashLoanAction(
                morphoMarketParams[1],
                repayAmount,
            ),
        );
        const unwrapPtTokensAction = new dfs.actions.pendle.PendleTokenUnwrapAction(
            pendleMarket,
            pendleUnderlying,
            morphoMarketParams[1],
            proxy.address,
            proxy.address,
            repayAmount,
            1,
        );
        const sellAction = new dfs.actions.basic.SellAction(
            await formatMockExchangeObj(
                pendleUnderlyingInfo,
                loanTokenInfo,
                '$2',
            ),
            proxy.address,
            proxy.address,
        );
        const paybackAction = new dfs.actions.morphoblue.MorphoBluePaybackAction(
            morphoMarketParams[0],
            morphoMarketParams[1],
            morphoMarketParams[2],
            morphoMarketParams[3],
            morphoMarketParams[4],
            '$3',
            proxy.address,
            nullAddress,
        );
        const flAddress = await getAddrFromRegistry('FLAction');
        const withdrawAction = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
            morphoMarketParams[0],
            morphoMarketParams[1],
            morphoMarketParams[2],
            morphoMarketParams[3],
            morphoMarketParams[4],
            '$1',
            nullAddress,
            flAddress,
        );
        const repayRecipe = new dfs.Recipe('FLRepayRecipe', [
            flAction,
            unwrapPtTokensAction,
            sellAction,
            paybackAction,
            withdrawAction,
        ]);
        const functionData = repayRecipe.encodeForDsProxyCall();

        await executeAction('RecipeExecutor', functionData[1], proxy);

        const ratioAfter = await view.callStatic.getRatioUsingParams(
            morphoMarketParams,
            proxy.address,
        );
        console.log('Ratio after repay', ratioAfter);
        expect(ratioBefore).to.be.lt(ratioAfter);

        await validateNoTokensLeftOnProxy();
    });
});
