const hre = require('hardhat');
const { utils: { curveusdUtils: { curveusdMarkets } } } = require('@defisaver/sdk');

const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const { createCurveUsdRepayStrategy, createCurveUsdAdvancedRepayStrategy, createCurveUsdFLRepayStrategy } = require('../../strategies');
const {
    openStrategyAndBundleStorage,
    redeployCore, redeploy, getProxy,
    takeSnapshot, fetchAmountinUSDPrice,
    setBalance, approve, revertToSnapshot,
    Float2BN, formatExchangeObjCurve, addrs, getAddrFromRegistry,
} = require('../../utils');
const { createStrategy, createBundle, addBotCaller } = require('../../utils-strategies');
const { curveUsdCreate } = require('../../actions');
const { subCurveUsdRepayBundle } = require('../../strategy-subs');
const { callCurveUsdRepayStrategy, callCurveUsdAdvancedRepayStrategy, callCurveUsdFLRepayStrategy } = require('../../strategy-calls');
const { getActiveBand } = require('../../curveusd/curveusd-tests');

const crvusdAddress = getAssetInfo('crvUSD').address;
const createRepayBundle = async (proxy, isFork) => {
    const curveUsdAdvancedRepayStrategy = createCurveUsdAdvancedRepayStrategy();
    const curveUsdRepayStrategy = createCurveUsdRepayStrategy();
    const curveUsdFLRepayStrategy = createCurveUsdFLRepayStrategy();
    await openStrategyAndBundleStorage(isFork);
    const strategyIdFirst = await createStrategy(proxy, ...curveUsdAdvancedRepayStrategy, true);
    const strategyIdSecond = await createStrategy(proxy, ...curveUsdRepayStrategy, true);
    const strategyIdThird = await createStrategy(proxy, ...curveUsdFLRepayStrategy, true);
    return createBundle(
        proxy,
        [strategyIdFirst, strategyIdSecond, strategyIdThird],
    );
};

const curveUsdRepayStrategyTest = async () => {
    describe('CurveUsd-Repay-Strategy', function () {
        this.timeout(1200000);

        const SUPPLY_AMOUNT_USD = '100000';
        const GENERATE_AMOUNT_CRVUSD = '50000';
        const REPAY_AMOUNT_USD = '5000';

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let crvusdView;
        let strategySub;
        let repayBundleId;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutor = await redeployCore();
            crvusdView = await redeploy('CurveUsdView');
            await redeploy('CurveUsdRepay');
            await redeploy('CurveUsdCollRatioTrigger');
            await redeploy('CurveUsdCollRatioCheck');
            await redeploy('CurveUsdSwapper');
            // await redeploy('CurveUsdCreate');
            // await redeploy('CurveUsdWithdraw');
            // await redeploy('CurveUsdPayback');
            // await redeploy('FLAction');
            // await redeploy('DFSSell');
            // await redeploy('GasFeeTaker');

            await addBotCaller(botAcc.address);

            proxy = await getProxy(senderAcc.address);
        });

        it('... should create a repay bundle', async () => {
            repayBundleId = await createRepayBundle(proxy, false);
        });

        Object.entries(curveusdMarkets)
            // eslint-disable-next-line array-callback-return
            .map(([assetSymbol, { controllerAddress }]) => {
                const collateralAsset = getAssetInfo(assetSymbol);
                let snapshot;
                let collateralAmount;

                it(`Create new curve position to be repaid in ${assetSymbol} market`, async () => {
                    collateralAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(assetSymbol, SUPPLY_AMOUNT_USD),
                        collateralAsset.decimals,
                    );
                    const debtAmount = hre.ethers.utils.parseUnits(GENERATE_AMOUNT_CRVUSD);
                    const nBands = 10;
                    await setBalance(collateralAsset.address, senderAcc.address, collateralAmount);
                    await approve(collateralAsset.address, proxy.address);
                    await curveUsdCreate(
                        proxy,
                        controllerAddress,
                        senderAcc.address,
                        senderAcc.address,
                        collateralAmount,
                        debtAmount,
                        nBands,
                    );
                });
                it('Subscribes to repay strategy', async () => {
                    const ratioUnder = Float2BN('2.5');
                    const targetRatio = Float2BN('3');
                    ({ subId, strategySub } = await subCurveUsdRepayBundle(
                        proxy, repayBundleId, controllerAddress,
                        ratioUnder, targetRatio, collateralAsset.address, crvusdAddress,
                    ));
                });
                it(`Executes advanced repay strategy for ${assetSymbol} market`, async () => {
                    snapshot = await takeSnapshot();
                    const userDataBefore = await crvusdView.userData(
                        controllerAddress, proxy.address,
                    );
                    const collRatioBefore = userDataBefore.collRatio;
                    const repayAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(assetSymbol, REPAY_AMOUNT_USD),
                        collateralAsset.decimals,
                    );
                    const exchangeObj = await formatExchangeObjCurve(
                        collateralAsset.address,
                        crvusdAddress,
                        repayAmount,
                        addrs.mainnet.CURVE_USD_WRAPPER,
                    );
                    await callCurveUsdAdvancedRepayStrategy(
                        botAcc,
                        strategyExecutor,
                        0,
                        subId,
                        strategySub,
                        repayAmount,
                        exchangeObj[8],
                    );
                    const userDataAfter = await crvusdView.userData(
                        controllerAddress, proxy.address,
                    );
                    const collRatioAfter = userDataAfter.collRatio;
                    console.log(`Collateral ratio went from ${collRatioBefore / 1e16}% to ${collRatioAfter / 1e16}%`);
                    expect(collRatioAfter).to.be.gt(collRatioBefore);
                    await revertToSnapshot(snapshot);
                });
                it(`Executes a regular repay strategy for ${assetSymbol} market`, async () => {
                    snapshot = await takeSnapshot();
                    const userDataBefore = await crvusdView.userData(
                        controllerAddress, proxy.address,
                    );
                    const collRatioBefore = userDataBefore.collRatio;
                    const repayAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(assetSymbol, REPAY_AMOUNT_USD),
                        collateralAsset.decimals,
                    );

                    const maxActiveBand = await getActiveBand(controllerAddress);
                    const exchangeObj = await formatExchangeObjCurve(
                        collateralAsset.address,
                        crvusdAddress,
                        repayAmount,
                        addrs.mainnet.CURVE_WRAPPER_V3,
                    );
                    await callCurveUsdRepayStrategy(
                        botAcc,
                        strategyExecutor,
                        1,
                        subId,
                        strategySub,
                        repayAmount,
                        maxActiveBand,
                        exchangeObj,
                    );
                    const userDataAfter = await crvusdView.userData(
                        controllerAddress, proxy.address,
                    );
                    const collRatioAfter = userDataAfter.collRatio;
                    console.log(`Collateral ratio went from ${collRatioBefore / 1e16}% to ${collRatioAfter / 1e16}%`);
                    expect(collRatioAfter).to.be.gt(collRatioBefore);
                    await revertToSnapshot(snapshot);
                });
                it(`Executes a flashloan repay strategy for ${assetSymbol} market`, async () => {
                    if (assetSymbol.toLowerCase() === 'tbtc' || assetSymbol.toLowerCase() === 'sfrxeth') return;
                    snapshot = await takeSnapshot();
                    const userDataBefore = await crvusdView.userData(
                        controllerAddress, proxy.address,
                    );
                    const collRatioBefore = userDataBefore.collRatio;
                    const repayAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(assetSymbol, REPAY_AMOUNT_USD),
                        collateralAsset.decimals,
                    );
                    const maxActiveBand = await getActiveBand(controllerAddress);
                    const exchangeObj = await formatExchangeObjCurve(
                        collateralAsset.address,
                        crvusdAddress,
                        repayAmount,
                        addrs.mainnet.CURVE_WRAPPER_V3,
                    );
                    const flActionAddr = await getAddrFromRegistry('FLAction');
                    await callCurveUsdFLRepayStrategy(
                        botAcc,
                        strategyExecutor,
                        2,
                        subId,
                        strategySub,
                        repayAmount,
                        collateralAsset.address,
                        maxActiveBand,
                        exchangeObj,
                        flActionAddr,
                    );
                    const userDataAfter = await crvusdView.userData(
                        controllerAddress, proxy.address,
                    );
                    const collRatioAfter = userDataAfter.collRatio;
                    console.log(`Collateral ratio went from ${collRatioBefore / 1e16}% to ${collRatioAfter / 1e16}%`);
                    expect(collRatioAfter).to.be.gt(collRatioBefore);
                    await revertToSnapshot(snapshot);
                });
            });
    });
};

module.exports = {
    curveUsdRepayStrategyTest,
};
