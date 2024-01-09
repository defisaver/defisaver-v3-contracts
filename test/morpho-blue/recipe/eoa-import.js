/* eslint-disable no-await-in-loop */
const hre = require('hardhat');
const { expect } = require('chai');
const dfs = require('@defisaver/sdk');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, nullAddress, fetchAmountinUSDPrice,
    getAddrFromRegistry,
} = require('../../utils');
const {
    getMarkets, collateralSupplyAmountInUsd, supplyToMarket, borrowAmountInUsd, MORPHO_BLUE_ADDRESS,
} = require('../utils');
const { executeAction } = require('../../actions');

describe('Morpho-Blue-Import', function () {
    this.timeout(80000);

    const markets = getMarkets();

    let senderAcc; let proxy; let snapshot; let view;
    let supplyAmountInWei; let morphoBlue;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('MorphoBlueSupplyCollateral');
        await redeploy('MorphoBlueBorrow');
        await redeploy('MorphoBlueWithdrawCollateral');
        await redeploy('MorphoBluePayback');
        view = await (await hre.ethers.getContractFactory('MorphoBlueView')).deploy();
        morphoBlue = await hre.ethers.getContractAt('IMorphoBlue', MORPHO_BLUE_ADDRESS);

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
            await approve(collToken.address, morphoBlue.address, senderAcc);
            await morphoBlue.supplyCollateral(
                marketParams, supplyAmountInWei, senderAcc.address, [],
            );

            const borrowAmount = fetchAmountinUSDPrice(loanToken.symbol, borrowAmountInUsd);
            const borrowAmountInWei = hre.ethers.utils.parseUnits(
                borrowAmount, loanToken.decimals,
            );

            await morphoBlue.borrow(marketParams, borrowAmountInWei, '0', senderAcc.address, senderAcc.address);
        }
        await morphoBlue.setAuthorization(proxy.address, true);
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
        it(`should import MorphoBlue ${collToken.symbol}/${loanToken.symbol} position`, async () => {
            let positionInfoEoa = await view.callStatic.getUserInfo(
                marketParams, senderAcc.address,
            );
            const flAmount = positionInfoEoa.borrowedInAssets.mul('101').div('100');
            const flashloanAction = new dfs.actions.flashloan.FLAction(
                new dfs.actions.flashloan.BalancerFlashLoanAction(
                    [loanToken.address],
                    [flAmount],
                ),
            );
            const paybackAction = new dfs.actions.morphoblue.MorphoBluePaybackAction(
                marketParams[0],
                marketParams[1],
                marketParams[2],
                marketParams[3],
                marketParams[4],
                hre.ethers.constants.MaxUint256,
                proxy.address,
                senderAcc.address,
            );
            const withdrawAction = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
                marketParams[0],
                marketParams[1],
                marketParams[2],
                marketParams[3],
                marketParams[4],
                positionInfoEoa.collateral,
                senderAcc.address,
                proxy.address,
            );
            const supplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
                marketParams[0],
                marketParams[1],
                marketParams[2],
                marketParams[3],
                marketParams[4],
                positionInfoEoa.collateral,
                proxy.address,
                proxy.address,
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
            const sendTokens = new dfs.actions.basic.SendTokenAction(
                loanToken.address,
                senderAcc.address,
                hre.ethers.constants.MaxUint256,
            );

            const repayRecipe = new dfs.Recipe('ImportRecipe', [
                flashloanAction,
                paybackAction,
                withdrawAction,
                supplyAction,
                borrowAction,
                sendTokens,
            ]);
            const functionData = repayRecipe.encodeForDsProxyCall();
            await executeAction('RecipeExecutor', functionData[1], proxy);
            const eoaCollBefore = positionInfoEoa.collateral;
            positionInfoEoa = await view.callStatic.getUserInfo(marketParams, senderAcc.address);
            expect(positionInfoEoa.borrowedInAssets).to.be.eq(0);
            expect(positionInfoEoa.collateral).to.be.eq(0);
            const positionProxy = await view.callStatic.getUserInfo(marketParams, proxy.address);
            expect(eoaCollBefore).to.be.eq(positionProxy.collateral);
            expect(positionProxy.borrowedInAssets).to.be.gte(flAmount);
        });
    }
});
