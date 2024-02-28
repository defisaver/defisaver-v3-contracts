const hre = require('hardhat');
const { utils: { curveusdUtils: { curveusdMarkets } } } = require('@defisaver/sdk');

const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const {
    redeployCore, redeploy, getProxy,
    takeSnapshot, fetchAmountinUSDPrice,
    setBalance, approve, revertToSnapshot,
    Float2BN, formatExchangeObjCurve, addrs, getAddrFromRegistry, balanceOf,
    setNewExchangeWrapper,
} = require('../../utils');
const { addBotCaller } = require('../../utils-strategies');
const { curveUsdCreate } = require('../../actions');
const { subCurveUsdRepayBundle, subCurveUsdBoostBundle } = require('../../strategy-subs');
const {
    callCurveUsdRepayStrategy,
    callCurveUsdAdvancedRepayStrategy,
    callCurveUsdFLRepayStrategy,
    callCurveUsdBoostStrategy,
    callCurveUsdFLDebtBoostStrategy,
    callCurveUsdFLCollBoostStrategy,
} = require('../../strategy-calls');
const { getActiveBand } = require('../../curveusd/curveusd-tests');

const crvUsdAddress = getAssetInfo('crvUSD').address;

const isExchangePathValid = async (exchangeData) => {
    if (exchangeData.toString().includes('5e74c9036fb86bd7ecdcb084a0673efc32ea31cb')) {
        return false;
    }
    if (exchangeData.toString().includes('fe18be6b3bd88a2d2a7f928d00292e7a9963cfc6')) {
        return false;
    }
    if (exchangeData.toString().includes('57Ab1ec28D129707052df4dF418D58a2D46d5f51')) {
        return false;
    }

    return true;
};

const curveUsdBoostStrategyTest = async () => {
    describe('CurveUsd-Boost-Strategy', function () {
        this.timeout(1200000);

        const SUPPLY_AMOUNT_USD = '100000';
        const GENERATE_AMOUNT_CRVUSD = '50000';
        const BOOST_AMOUNT_USD = '5000';

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let crvUsdView;
        let strategySub;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutor = await redeployCore();
            crvUsdView = await redeploy('CurveUsdView');
            await redeploy('CurveUsdCollRatioCheck');
            await redeploy('DFSSell');
            await redeploy('FLAction');
            await redeploy('SendTokens');

            await addBotCaller(botAcc.address);

            await setNewExchangeWrapper(senderAcc, addrs.mainnet.CURVE_WRAPPER_V3);

            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        });

        Object.entries(curveusdMarkets)
            // eslint-disable-next-line array-callback-return
            .map(([assetSymbol, { controllerAddress }]) => {
                const collateralAsset = getAssetInfo(assetSymbol);
                let snapshot;
                let collateralAmount;

                it(`Create new curve position to be boosted in ${assetSymbol} market`, async () => {
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
                it('Subscribes to boost strategy', async () => {
                    const targetRatio = 150;
                    const ratioOver = 180;
                    ({ subId, strategySub } = await subCurveUsdBoostBundle(
                        proxy,
                        controllerAddress,
                        ratioOver,
                        targetRatio,
                        collateralAsset.address,
                        crvUsdAddress,
                    ));
                });
                it(`Executes boost without FL strategy for ${assetSymbol} market`, async () => {
                    snapshot = await takeSnapshot();
                    const userDataBefore = await crvUsdView.userData(
                        controllerAddress, proxy.address,
                    );
                    const collRatioBefore = userDataBefore.collRatio;
                    const boostAmount = hre.ethers.utils.parseUnits(
                        BOOST_AMOUNT_USD,
                    );
                    const exchangeObj = await formatExchangeObjCurve(
                        crvUsdAddress,
                        collateralAsset.address,
                        boostAmount,
                        addrs.mainnet.CURVE_WRAPPER_V3,
                    );

                    if (!isExchangePathValid(exchangeObj[8])) {
                        console.log('TEST SKIPPED! Invalid exchange path for asset');
                        expect(true).to.be.equal(true);
                        await revertToSnapshot(snapshot);
                    } else {
                        await callCurveUsdBoostStrategy(
                            botAcc,
                            strategyExecutor,
                            0,
                            subId,
                            strategySub,
                            boostAmount,
                            exchangeObj,
                        );
                        const userDataAfter = await crvUsdView.userData(
                            controllerAddress, proxy.address,
                        );
                        const collRatioAfter = userDataAfter.collRatio;
                        console.log(`Collateral ratio went from ${collRatioBefore / 1e16}% to ${collRatioAfter / 1e16}%`);
                        expect(collRatioBefore).to.be.gt(collRatioAfter);
                        await revertToSnapshot(snapshot);
                    }
                });

                it(`Executes a boost strategy with coll fl for ${assetSymbol} market`, async () => {
                    snapshot = await takeSnapshot();
                    const userDataBefore = await crvUsdView.userData(
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
                        crvUsdAddress,
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

                    const userDataAfter = await crvUsdView.userData(
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
                    await setBalance(crvUsdAddress, '0xBA12222222228d8Ba445958a75a0704d566BF2C8', Float2BN('10000'));
                    const userDataBefore = await crvUsdView.userData(
                        controllerAddress, proxy.address,
                    );
                    const collRatioBefore = userDataBefore.collRatio;
                    const boostAmount = hre.ethers.utils.parseUnits(
                        BOOST_AMOUNT_USD,
                    );
                    const exchangeObj = await formatExchangeObjCurve(
                        crvUsdAddress,
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
                        crvUsdAddress,
                        flActionAddr,
                    );
                    const userDataAfter = await crvUsdView.userData(
                        controllerAddress, proxy.address,
                    );
                    const collRatioAfter = userDataAfter.collRatio;
                    console.log(`Collateral ratio went from ${collRatioBefore / 1e16}% to ${collRatioAfter / 1e16}%`);
                    expect(collRatioBefore).to.be.gt(collRatioAfter);
                    await revertToSnapshot(snapshot);
                });
            });
    });
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

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutor = await redeployCore();
            crvusdView = await redeploy('CurveUsdView');
            await redeploy('CurveUsdCollRatioCheck');
            await redeploy('CurveUsdPayback');
            await redeploy('DFSSell');
            await redeploy('FLAction');
            await redeploy('SendTokens');
            await redeploy('CurveUsdRepay');
            await addBotCaller(botAcc.address);

            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);

            await setNewExchangeWrapper(senderAcc, addrs.mainnet.CURVE_WRAPPER_V3);
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
                    const ratioUnder = 250;
                    const targetRatio = 300;
                    ({ subId, strategySub } = await subCurveUsdRepayBundle(
                        proxy,
                        controllerAddress,
                        ratioUnder,
                        targetRatio,
                        collateralAsset.address,
                        crvUsdAddress,
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
                        crvUsdAddress,
                        repayAmount,
                        addrs.mainnet.CURVE_USD_WRAPPER,
                    );

                    if (!isExchangePathValid(exchangeObj[8])) {
                        console.log('TEST SKIPPED! Invalid exchange path for asset');
                        expect(true).to.be.equal(true);
                        await revertToSnapshot(snapshot);
                    } else {
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
                    }
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
                        crvUsdAddress,
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
                        crvUsdAddress,
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
    curveUsdBoostStrategyTest,
};
