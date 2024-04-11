/* eslint-disable max-len */
const hre = require('hardhat');

const { getAssetInfo, getAssetInfoByAddress } = require('@defisaver/tokens');
const { expect } = require('chai');
const {
    redeployCore, redeploy, getProxy,
    takeSnapshot, fetchAmountinUSDPrice,
    setBalance, approve, revertToSnapshot,
    Float2BN, formatExchangeObjCurve, addrs, getAddrFromRegistry, balanceOf,
    setNewExchangeWrapper,
    openStrategyAndBundleStorage,
    nullAddress,
    formatMockExchangeObj,
} = require('../../utils');
const { addBotCaller, createStrategy } = require('../../utils-strategies');
const { curveUsdCreate, llamalendCreate } = require('../../actions');
const { subCurveUsdRepayBundle, subCurveUsdBoostBundle, subCurveUsdPaybackStrategy, subLlamaLendBoostStrategy } = require('../../strategy-subs');
const {
    callCurveUsdRepayStrategy,
    callCurveUsdAdvancedRepayStrategy,
    callCurveUsdFLRepayStrategy,
    callCurveUsdBoostStrategy,
    callCurveUsdFLDebtBoostStrategy,
    callCurveUsdFLCollBoostStrategy,
    callCurveUsdPaybackStrategy,
} = require('../../strategy-calls');
const { getActiveBand } = require('../../curveusd/curveusd-tests');
const { createCurveUsdPaybackStrategy, createLlamalendBoostStrategy } = require('../../strategies');
const { getControllers, supplyToMarket } = require('../../llamalend/utils');

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

const llamalendBoostStrategyTest = async () => {
    describe('Llamalend-Boost-Strategy', function () {
        this.timeout(1200000);

        const SUPPLY_USD_AMOUNT = '100000';
        const BORROW_USD_AMOUNT = '50000';
        const BOOST_AMOUNT_USD = '5000';
        const controllers = getControllers();

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let view;
        let snapshot;
        let strategySub;
        let boostStrategyId;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutor = await redeployCore();

            view = await (await hre.ethers.getContractFactory('LlamaLendView')).deploy();
            await redeploy('LlamaLendCreate');
            await redeploy('LlamaLendBoost');
            await redeploy('LlamaLendSwapper');
            await redeploy('LlamaLendCollRatioTrigger');
            await redeploy('LlamaLendCollRatioCheck');
            const mockWrapper = await redeploy('MockExchangeWrapper');
            await setNewExchangeWrapper(senderAcc, mockWrapper.address);

            await addBotCaller(botAcc.address);

            await setNewExchangeWrapper(senderAcc, addrs.mainnet.CURVE_WRAPPER_V3);

            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            const boostStrategy = createLlamalendBoostStrategy();
            boostStrategyId = await createStrategy(proxy, ...boostStrategy, true);
            boostStrategyId = await createStrategy(proxy, ...boostStrategy, true);

            await openStrategyAndBundleStorage(proxy);
        });
        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });
        for (let i = 0; i < controllers.length; i++) {
            const controllerAddr = controllers[i];
            it(`should create a Llamalend position and then auto boost it in ${controllerAddr} Llamalend market`, async () => {
                await supplyToMarket(controllerAddr);
                const controller = await hre.ethers.getContractAt('ILlamaLendController', controllerAddr);
                const collTokenAddr = await controller.collateral_token();
                const debtTokenAddr = await controller.borrowed_token();
                const collToken = getAssetInfoByAddress(collTokenAddr);
                const debtToken = getAssetInfoByAddress(debtTokenAddr);
                const supplyAmount = fetchAmountinUSDPrice(
                    collToken.symbol, SUPPLY_USD_AMOUNT,
                );
                const borrowAmount = fetchAmountinUSDPrice(
                    debtToken.symbol, BORROW_USD_AMOUNT,
                );
                const supplyAmountInWei = (hre.ethers.utils.parseUnits(
                    supplyAmount, collToken.decimals,
                )).mul(2);
                const borrowAmountWei = hre.ethers.utils.parseUnits(
                    borrowAmount, debtToken.decimals,
                );

                await setBalance(collTokenAddr, senderAcc.address, supplyAmountInWei);
                await approve(collTokenAddr, proxy.address, senderAcc);
                await llamalendCreate(
                    proxy, controllerAddr, senderAcc.address, senderAcc.address,
                    supplyAmountInWei, borrowAmountWei, 10,
                );
                await subLlamaLendBoostStrategy(
                    proxy, controller, hre.ethers.utils.parseUnits('150', 16), hre.ethers.utils.parseUnits('300', 16),
                );

                const exchangeData = await formatMockExchangeObj(
                    debtToken,
                    collToken,
                    borrowAmountWei.mul(2),
                );
                const infoBeforeBoost = await view.callStatic.userData(controllerAddr, proxy.address);
                console.log(infoBeforeBoost.collRatio / 1e18);
                const infoAfterBoost = await view.callStatic.userData(controllerAddr, proxy.address);
                console.log(infoAfterBoost.collRatio / 1e18);
                expect(infoAfterBoost.collRatio).to.be.lt(infoBeforeBoost.collRatio);
                expect(infoAfterBoost.debtAmount).to.be.gt(infoBeforeBoost.debtAmount);
                // eslint-disable-next-line max-len
                expect(infoAfterBoost.marketCollateralAmount).to.be.gt(infoBeforeBoost.marketCollateralAmount);
            });
        }

        /*
        Object.entries(controllers)
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
            */
    });
};

module.exports = {
};
