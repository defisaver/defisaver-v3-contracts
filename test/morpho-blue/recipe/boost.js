/* eslint-disable no-await-in-loop */
const hre = require('hardhat');
const { expect } = require('chai');
const dfs = require('@defisaver/sdk');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, nullAddress,
    fetchAmountinUSDPrice, formatMockExchangeObj, setNewExchangeWrapper, getAddrFromRegistry,
} = require('../../utils');
const {
    getMarkets, collateralSupplyAmountInUsd, supplyToMarket, borrowAmountInUsd,
} = require('../utils');
const { morphoBlueSupplyCollateral, morphoBlueBorrow, executeAction } = require('../../actions');

describe('Morpho-Blue-Boost', function () {
    this.timeout(80000);

    const markets = getMarkets();

    let senderAcc; let proxy; let snapshot; let view;
    let borrowAmountInWei; let mockWrapper;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('MorphoBlueSupplyCollateral');
        await redeploy('MorphoBlueBorrow');
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
            const supplyAmountInWei = hre.ethers.utils.parseUnits(
                supplyAmount, collToken.decimals,
            );
            await setBalance(collToken.address, senderAcc.address, supplyAmountInWei);
            await approve(collToken.address, proxy.address, senderAcc);
            await morphoBlueSupplyCollateral(
                proxy, marketParams, supplyAmountInWei, senderAcc.address, nullAddress,
            );
            const borrowAmount = fetchAmountinUSDPrice(loanToken.symbol, borrowAmountInUsd);
            borrowAmountInWei = hre.ethers.utils.parseUnits(
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
        it(`should do a boost for MorphoBlue ${collToken.symbol}/${loanToken.symbol} position`, async () => {
            let positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            // at this moment position has been created and we'll do a boost
            const boostAmount = borrowAmountInWei.div(10);
            const borrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
                marketParams[0],
                marketParams[1],
                marketParams[2],
                marketParams[3],
                marketParams[4],
                boostAmount,
                nullAddress,
                proxy.address,
            );
            const sellAction = new dfs.actions.basic.SellAction(
                await formatMockExchangeObj(
                    loanToken,
                    collToken,
                    boostAmount,
                ),
                proxy.address,
                proxy.address,
            );
            const supplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
                marketParams[0],
                marketParams[1],
                marketParams[2],
                marketParams[3],
                marketParams[4],
                '$2',
                proxy.address,
                nullAddress,
            );

            const boostRecipe = new dfs.Recipe('BoostRecipe', [
                borrowAction,
                sellAction,
                supplyAction,
            ]);
            const functionData = boostRecipe.encodeForDsProxyCall();

            await executeAction('RecipeExecutor', functionData[1], proxy);
            const debtBefore = positionInfo.borrowedInAssets;
            const collBefore = positionInfo.collateral;
            positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            const debtAfter = positionInfo.borrowedInAssets;
            const collAfter = positionInfo.collateral;
            expect(debtBefore.add(boostAmount)).to.be.lte(debtAfter);
            expect(collAfter).to.be.gt(collBefore);
        });
        it(`should do a flashloan boost for MorphoBlue ${collToken.symbol}/${loanToken.symbol} position`, async () => {
            let positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            // at this moment position has been created and we'll do a boost
            const boostAmount = borrowAmountInWei.div(10);
            const flashloanAction = new dfs.actions.flashloan.FLAction(
                new dfs.actions.flashloan.BalancerFlashLoanAction(
                    [loanToken.address],
                    [boostAmount],
                ),
            );
            const sellAction = new dfs.actions.basic.SellAction(
                await formatMockExchangeObj(
                    loanToken,
                    collToken,
                    boostAmount,
                ),
                proxy.address,
                proxy.address,
            );
            const supplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
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
            const borrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
                marketParams[0],
                marketParams[1],
                marketParams[2],
                marketParams[3],
                marketParams[4],
                '$1',
                nullAddress,
                flAddress,
            );
            const boostRecipe = new dfs.Recipe('FLBoostRecipe', [
                flashloanAction,
                sellAction,
                supplyAction,
                borrowAction,
            ]);
            const functionData = boostRecipe.encodeForDsProxyCall();

            await executeAction('RecipeExecutor', functionData[1], proxy);
            const debtBefore = positionInfo.borrowedInAssets;
            const collBefore = positionInfo.collateral;
            positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
            const debtAfter = positionInfo.borrowedInAssets;
            const collAfter = positionInfo.collateral;
            expect(debtBefore.add(boostAmount)).to.be.lte(debtAfter);
            expect(collAfter).to.be.gt(collBefore);
        });
    }
});
