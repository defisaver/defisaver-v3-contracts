const hre = require('hardhat');
const { utils: { curveusdUtils: { curveusdMarkets } } } = require('@defisaver/sdk');

const { getAssetInfo, getAssetInfoByAddress } = require('@defisaver/tokens');
const { expect } = require('chai');
const {
    createMorphoBlueRepayStrategy,
    createMorphoBlueFLDebtRepayStrategy,
    createMorphoBlueFLCollRepayStrategy,
    createMorphoBlueBoostStrategy,
    createMorphoBlueFLDebtBoostStrategy,
    createMorphoBlueFLCollBoostStrategy,
} = require('../../strategies');
const {
    openStrategyAndBundleStorage,
    redeployCore, redeploy, getProxy,
    takeSnapshot, fetchAmountinUSDPrice,
    setBalance, approve, revertToSnapshot,
    Float2BN, formatExchangeObjCurve, addrs, getAddrFromRegistry,
    balanceOf, nullAddress, formatMockExchangeObj, setNewExchangeWrapper,
} = require('../../utils');
const { createStrategy, createBundle, addBotCaller } = require('../../utils-strategies');
const {
    curveUsdCreate, morphoBlueSupply, morphoBlueBorrow, morphoBlueSupplyCollateral,
} = require('../../actions');
const { subCurveUsdRepayBundle, subMorphoBlueBoostBundle } = require('../../strategy-subs');
const {
    callCurveUsdRepayStrategy,
    callCurveUsdAdvancedRepayStrategy,
    callCurveUsdFLRepayStrategy,
    callMorphoBlueBoostStrategy,
} = require('../../strategy-calls');
const { getActiveBand } = require('../../curveusd/curveusd-tests');
const { getMarkets, supplyToMarket } = require('../../morpho-blue/utils');

const crvusdAddress = getAssetInfo('crvUSD').address;
const createRepayBundle = async (proxy, isFork) => {
    const repayStrategy = createMorphoBlueRepayStrategy();
    const flCollRepayStrategy = createMorphoBlueFLCollRepayStrategy();
    const flDebtRepayStrategy = createMorphoBlueFLDebtRepayStrategy();
    await openStrategyAndBundleStorage(isFork);
    const strategyIdFirst = await createStrategy(proxy, ...repayStrategy, true);
    const strategyIdSecond = await createStrategy(proxy, ...flCollRepayStrategy, true);
    const strategyIdThird = await createStrategy(proxy, ...flDebtRepayStrategy, true);
    return createBundle(
        proxy,
        [strategyIdFirst, strategyIdSecond, strategyIdThird],
    );
};
const createBoostBundle = async (proxy, isFork) => {
    const boostStrategy = createMorphoBlueBoostStrategy();
    const flDebtBoostStrategy = createMorphoBlueFLDebtBoostStrategy();
    const fLCollBoostStrategy = createMorphoBlueFLCollBoostStrategy();
    await openStrategyAndBundleStorage(isFork);
    const strategyIdFirst = await createStrategy(proxy, ...boostStrategy, true);
    const strategyIdSecond = await createStrategy(proxy, ...flDebtBoostStrategy, true);
    const strategyIdThird = await createStrategy(proxy, ...fLCollBoostStrategy, true);
    return createBundle(
        proxy,
        [strategyIdFirst, strategyIdSecond, strategyIdThird],
    );
};

const morphoBlueBoostStrategyTest = async () => {
    describe('MorphoBlue-Boost-Strategy', function () {
        this.timeout(1200000);
        const markets = getMarkets();
        const SUPPLY_AMOUNT_USD = '100000';
        const DEBT_AMOUNT_USD = '50000';
        const BOOST_AMOUNT_USD = '5000';

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let morphoBlueView;
        let strategySub;
        let boostBundleId;
        let mockWrapper;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];
            await redeploy('MorphoBlueRatioTrigger');
            await redeploy('MorphoBlueRatioCheck');

            await redeploy('MorphoBlueBorrow');
            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');
            await redeploy('MorphoBlueSupplyCollateral');

            mockWrapper = await redeploy('MockExchangeWrapper');
            await setNewExchangeWrapper(senderAcc, mockWrapper.address);

            const strategyExecutorAddr = await getAddrFromRegistry('StrategyExecutor');
            strategyExecutor = await hre.ethers.getContractAt('StrategyExecutor', strategyExecutorAddr);
            morphoBlueView = await redeploy('MorphoBlueView');

            await addBotCaller(botAcc.address);

            proxy = await getProxy(senderAcc.address);
        });

        it('... should create a boost bundle', async () => {
            boostBundleId = await createBoostBundle(proxy, false);
        });

        for (let i = 0; i < markets.length; i++) {
            const marketParams = markets[i];
            const loanToken = getAssetInfoByAddress(marketParams[0]);
            const collToken = getAssetInfoByAddress(marketParams[1]);
            let snapshot;
            let collateralAmount;
            let debtAmount;
            let marketId;
            it(`Create new morphoblue position to be boosted in ${collToken.symbol}/${loanToken.symbol} market`, async () => {
                await supplyToMarket(marketParams);
                collateralAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(collToken.symbol, SUPPLY_AMOUNT_USD),
                    collToken.decimals,
                );
                debtAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(loanToken.symbol, DEBT_AMOUNT_USD),
                    loanToken.decimals,
                );
                await setBalance(collToken.address, senderAcc.address, collateralAmount);
                await approve(collToken.address, proxy.address);
                await morphoBlueSupplyCollateral(
                    proxy, marketParams, collateralAmount, senderAcc.address, nullAddress,
                );
                await morphoBlueBorrow(
                    proxy, marketParams, debtAmount, nullAddress, senderAcc.address,
                );
            });
            it('Subscribes to boost strategy', async () => {
                const targetRatio = Float2BN('1.5');
                const ratioOver = Float2BN('1.8');
                marketId = await morphoBlueView.getMarketId(marketParams);
                console.log(marketId);
                ({ subId, strategySub } = await subMorphoBlueBoostBundle(
                    proxy,
                    boostBundleId,
                    marketParams,
                    marketId,
                    ratioOver,
                    targetRatio,
                    proxy.address,
                ));
            });
            it(`Executes boost without FL strategy for ${collToken.symbol}/${loanToken.symbol} market`, async () => {
                snapshot = await takeSnapshot();
                const ratioBefore = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, proxy.address,
                );
                console.log(ratioBefore.toString());
                const boostAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(loanToken.symbol, BOOST_AMOUNT_USD),
                    loanToken.decimals,
                );
                const exchangeObj = await formatMockExchangeObj(
                    loanToken,
                    collToken,
                    boostAmount,
                );
                await callMorphoBlueBoostStrategy(
                    botAcc,
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    boostAmount,
                    exchangeObj,
                );
                const ratioAfter = await morphoBlueView.callStatic.getRatioUsingId(
                    marketId, proxy.address,
                );
                console.log(`Collateral ratio went from ${ratioBefore / 1e16}% to ${ratioAfter / 1e16}%`);
                // expect(collRatioBefore).to.be.gt(collRatioAfter);
                await revertToSnapshot(snapshot);
            });
            /*
            it(`Executes a boost strategy with coll fl for ${assetSymbol} market`, async () => {
                snapshot = await takeSnapshot();
                const userDataBefore = await crvusdView.userData(
                    controllerAddress, proxy.address,
                );
                const collRatioBefore = userDataBefore.collRatio;
                const flAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(assetSymbol, BOOST_AMOUNT_USD),
                    collateralAsset.decimals,
                ); // this is amount of collateral we're flashloaning
                const boostAmount = hre.ethers.utils.parseUnits(
                    (BOOST_AMOUNT_USD * 1.1).toString(),
                );
                    // this amount is what we're borrowing,
                    // this * price - slippage should equal flAmount
                await setBalance(collateralAsset.address, '0xBA12222222228d8Ba445958a75a0704d566BF2C8', boostAmount);

                const exchangeObj = await formatExchangeObjCurve(
                    crvusdAddress,
                    collateralAsset.address,
                    boostAmount,
                    addrs.mainnet.CURVE_WRAPPER_V3,
                );
                const flActionAddr = await getAddrFromRegistry('FLAction');
                const collBefore = await balanceOf(collateralAsset.address, senderAcc.address);
                await callCurveUsdFLCollBoostStrategy(
                    botAcc,
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    boostAmount,
                    exchangeObj,
                    collateralAsset.address,
                    flActionAddr,
                    flAmount.toString(),
                );
                const collAfter = await balanceOf(collateralAsset.address, senderAcc.address);

                const userDataAfter = await crvusdView.userData(
                    controllerAddress, proxy.address,
                );
                const collRatioAfter = userDataAfter.collRatio;
                console.log(`User received ${collAfter.sub(collBefore)} of coll on his EOA`);
                console.log(`Collateral ratio went from ${collRatioBefore / 1e16}% to ${collRatioAfter / 1e16}%`);
                expect(collRatioBefore).to.be.gt(collRatioAfter);
                await revertToSnapshot(snapshot);
            });

            it(`Executes a boost strategy with crvusd flashloan for ${assetSymbol} market`, async () => {
                snapshot = await takeSnapshot();
                await setBalance(crvusdAddress, '0xBA12222222228d8Ba445958a75a0704d566BF2C8', Float2BN('10000'));
                const userDataBefore = await crvusdView.userData(
                    controllerAddress, proxy.address,
                );
                const collRatioBefore = userDataBefore.collRatio;
                const boostAmount = hre.ethers.utils.parseUnits(
                    BOOST_AMOUNT_USD,
                );
                const exchangeObj = await formatExchangeObjCurve(
                    crvusdAddress,
                    collateralAsset.address,
                    boostAmount,
                    addrs.mainnet.CURVE_WRAPPER_V3,
                );
                const flActionAddr = await getAddrFromRegistry('FLAction');
                await callCurveUsdFLDebtBoostStrategy(
                    botAcc,
                    strategyExecutor,
                    2,
                    subId,
                    strategySub,
                    boostAmount,
                    exchangeObj,
                    crvusdAddress,
                    flActionAddr,
                );
                const userDataAfter = await crvusdView.userData(
                    controllerAddress, proxy.address,
                );
                const collRatioAfter = userDataAfter.collRatio;
                console.log(`Collateral ratio went from ${collRatioBefore / 1e16}% to ${collRatioAfter / 1e16}%`);
                expect(collRatioBefore).to.be.gt(collRatioAfter);
                await revertToSnapshot(snapshot);
            });
            */
        }
    });
};

const morphoBlueRepayStrategyTest = async () => {
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

            const strategyExecutorAddr = await getAddrFromRegistry('StrategyExecutor');
            strategyExecutor = await hre.ethers.getContractAt('StrategyExecutor', strategyExecutorAddr);
            crvusdView = await redeploy('CurveUsdView');
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
                    snapshot = await takeSnapshot();
                    const userDataBefore = await crvusdView.userData(
                        controllerAddress, proxy.address,
                    );
                    const collRatioBefore = userDataBefore.collRatio;
                    const repayAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(assetSymbol, REPAY_AMOUNT_USD),
                        collateralAsset.decimals,
                    );
                    await setBalance(collateralAsset.address, '0xBA12222222228d8Ba445958a75a0704d566BF2C8', repayAmount);
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
    morphoBlueRepayStrategyTest,
    morphoBlueBoostStrategyTest,
};
