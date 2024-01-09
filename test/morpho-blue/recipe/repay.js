/* eslint-disable no-await-in-loop */
const hre = require('hardhat');
const { expect } = require('chai');
const dfs = require('@defisaver/sdk');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, nullAddress, fetchAmountinUSDPrice,
    formatMockExchangeObj, setNewExchangeWrapper, getAddrFromRegistry,
} = require('../../utils');
const {
    getMarkets, collateralSupplyAmountInUsd, supplyToMarket, borrowAmountInUsd,
} = require('../utils');
const { morphoBlueSupplyCollateral, morphoBlueBorrow, executeAction } = require('../../actions');

describe('Morpho-Blue-Repay', function () {
    this.timeout(80000);

    const markets = getMarkets();

    let senderAcc; let proxy; let snapshot; let view; let mockWrapper;
    let supplyAmountInWei;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('MorphoBlueSupplyCollateral');
        await redeploy('MorphoBlueBorrow');
        await redeploy('MorphoBlueWithdrawCollateral');
        await redeploy('MorphoBluePayback');
        mockWrapper = await redeploy('MockExchangeWrapper');
        view = await (await hre.ethers.getContractFactory('MorphoBlueView')).deploy();
        await setNewExchangeWrapper(senderAcc, mockWrapper.address);

        for (let i = 0; i < markets.length; i++) {
            const marketParams = markets[i];
            const loanToken = getAssetInfoByAddress(marketParams[0]);
            const collToken = getAssetInfoByAddress(marketParams[1]);

            await supplyToMarket(marketParams);
            const supplyAmount = fetchAmountinUSDPrice(
                collToken.symbol, collateralSupplyAmountInUsd,
            );
            supplyAmountInWei = hre.ethers.utils.parseUnits(
                supplyAmount, collToken.decimals,
            );
            await setBalance(collToken.address, senderAcc.address, supplyAmountInWei);
            await approve(collToken.address, proxy.address, senderAcc);
            await morphoBlueSupplyCollateral(
                proxy, marketParams, supplyAmountInWei, senderAcc.address, nullAddress,
            );
            const borrowAmount = fetchAmountinUSDPrice(loanToken.symbol, borrowAmountInUsd);
            const borrowAmountInWei = hre.ethers.utils.parseUnits(
                borrowAmount, loanToken.decimals,
            );
            await morphoBlueBorrow(
                proxy, marketParams, borrowAmountInWei, nullAddress, senderAcc.address,
            );
        }
    });
    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });
    for (let i = 0; i < markets.length; i++) {
        const marketParams = markets[i];
        const loanToken = getAssetInfoByAddress(marketParams[0]);
        const collToken = getAssetInfoByAddress(marketParams[1]);
        it(`should do a repay for MorphoBlue ${collToken.symbol}/${loanToken.symbol} position`, async () => {
            let positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            const repayAmount = supplyAmountInWei.div(10);
            const withdrawAction = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
                marketParams[0],
                marketParams[1],
                marketParams[2],
                marketParams[3],
                marketParams[4],
                repayAmount,
                nullAddress,
                proxy.address,
            );
            const sellAction = new dfs.actions.basic.SellAction(
                await formatMockExchangeObj(
                    collToken,
                    loanToken,
                    repayAmount,
                ),
                proxy.address,
                proxy.address,
            );
            const paybackAction = new dfs.actions.morphoblue.MorphoBluePaybackAction(
                marketParams[0],
                marketParams[1],
                marketParams[2],
                marketParams[3],
                marketParams[4],
                '$2',
                proxy.address,
                nullAddress,
            );
            const repayRecipe = new dfs.Recipe('RepayRecipe', [
                withdrawAction,
                sellAction,
                paybackAction,
            ]);
            const functionData = repayRecipe.encodeForDsProxyCall();

            await executeAction('RecipeExecutor', functionData[1], proxy);
            const debtBefore = positionInfo.borrowedInAssets;
            const collBefore = positionInfo.collateral;
            positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            const debtAfter = positionInfo.borrowedInAssets;
            const collAfter = positionInfo.collateral;
            expect(debtAfter).to.be.lt(debtBefore);
            expect(collAfter.add(repayAmount)).to.be.eq(collBefore);
        });
        it(`should do a flashloan repay for MorphoBlue ${collToken.symbol}/${loanToken.symbol} position`, async () => {
            let positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            const repayAmount = supplyAmountInWei.div(10);
            const flashloanAction = new dfs.actions.flashloan.FLAction(
                new dfs.actions.flashloan.BalancerFlashLoanAction(
                    [collToken.address],
                    [repayAmount],
                ),
            );
            const sellAction = new dfs.actions.basic.SellAction(
                await formatMockExchangeObj(
                    collToken,
                    loanToken,
                    repayAmount,
                ),
                proxy.address,
                proxy.address,
            );
            const paybackAction = new dfs.actions.morphoblue.MorphoBluePaybackAction(
                marketParams[0],
                marketParams[1],
                marketParams[2],
                marketParams[3],
                marketParams[4],
                '$2',
                proxy.address,
                nullAddress,
            );
            const flAddress = await getAddrFromRegistry('FLAction');
            const withdrawAction = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
                marketParams[0],
                marketParams[1],
                marketParams[2],
                marketParams[3],
                marketParams[4],
                '$1',
                nullAddress,
                flAddress,
            );
            const repayRecipe = new dfs.Recipe('FLRepayRecipe', [
                flashloanAction,
                sellAction,
                paybackAction,
                withdrawAction,
            ]);
            const functionData = repayRecipe.encodeForDsProxyCall();

            await executeAction('RecipeExecutor', functionData[1], proxy);
            const debtBefore = positionInfo.borrowedInAssets;
            const collBefore = positionInfo.collateral;
            positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            const debtAfter = positionInfo.borrowedInAssets;
            const collAfter = positionInfo.collateral;
            expect(debtAfter).to.be.lt(debtBefore);
            expect(collAfter.add(repayAmount)).to.be.eq(collBefore);
        });
    }
});
