// AaveV3 Boost On Price strategies
const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const automationSdk = require('@defisaver/automation-sdk');

const {
    getProxy,
    network,
    addrs,
    takeSnapshot,
    revertToSnapshot,
    chainIds,
    getContractFromRegistry,
    getStrategyExecutorContract,
    getAndSetMockExchangeWrapper,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    isNetworkFork,
    redeploy,
    sendEther,
    addBalancerFlLiquidity,
} = require('../../../utils/utils');

const { addBotCaller } = require('../../utils/utils-strategies');
const { subAaveV3LeverageManagementOnPriceGeneric } = require('../../utils/strategy-subs');
const {
    callAaveV3GenericBoostOnPriceStrategy,
    callAaveV3GenericFLBoostOnPriceStrategy,
} = require('../../utils/strategy-calls');
const {
    AAVE_V3_AUTOMATION_TEST_PAIRS_BOOST,
    openAaveV3ProxyPosition,
    openAaveV3EOAPosition,
    getAaveV3PositionRatio,
    deployAaveV3BoostOnPriceGenericBundle,
    setupAaveV3EOAPermissions,
    getAaveV3ReserveData,
} = require('../../../utils/aave');

const TRIGGER_PRICE_UNDER = 999_999;
const TRIGGER_PRICE_OVER = 0;
const PRICE_STATE_UNDER = automationSdk.enums.RatioState.UNDER;
const PRICE_STATE_OVER = automationSdk.enums.RatioState.OVER;

const runBoostOnPriceTests = () => {
    describe('AaveV3 Boost On Price Strategies Tests', () => {
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let mockWrapper;
        let flAddr;
        let bundleId;

        before(async () => {
            // Setup
            const isFork = isNetworkFork();
            await hre.network.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];
            await sendEther(senderAcc, addrs[network].OWNER_ACC, '10');
            proxy = await getProxy(senderAcc.address);
            await addBotCaller(botAcc.address, isFork);
            strategyExecutor = (await getStrategyExecutorContract()).connect(botAcc);
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);

            const flContract = await getContractFromRegistry('FLAction', isFork);
            flAddr = flContract.address;

            // Redeploys
            await redeploy('AaveV3QuotePriceTrigger', isFork);
            await redeploy('AaveV3Borrow', isFork);
            await redeploy('AaveV3Payback', isFork);
            await redeploy('AaveV3Supply', isFork);
            await redeploy('AaveV3Withdraw', isFork);
            await redeploy('AaveV3RatioCheck', isFork);
            await redeploy('AaveV3OpenRatioCheck', isFork);
            await redeploy('AaveV3View', isFork);
            await redeploy('SubProxy', isFork);

            bundleId = await deployAaveV3BoostOnPriceGenericBundle();
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        const baseTest = async (
            collAsset,
            debtAsset,
            targetRatio,
            collAmountInUSD,
            debtAmountInUSD,
            boostAmountInUSD,
            isEOA,
            isFLStrategy,
            triggerPrice,
            priceState,
        ) => {
            const positionOwner = isEOA ? senderAcc.address : proxy.address;

            // Open position
            if (isEOA) {
                await openAaveV3EOAPosition(
                    senderAcc.address,
                    collAsset.symbol,
                    debtAsset.symbol,
                    collAmountInUSD,
                    debtAmountInUSD,
                );

                // EOA delegates to the actual Smart Wallet address that executes the strategy
                await setupAaveV3EOAPermissions(
                    senderAcc.address,
                    proxy.address, // The actual Smart Wallet executing address
                    collAsset.address,
                    debtAsset.address,
                );
            } else {
                await openAaveV3ProxyPosition(
                    senderAcc.address,
                    proxy,
                    collAsset.symbol,
                    debtAsset.symbol,
                    collAmountInUSD,
                    debtAmountInUSD,
                );
            }

            // Check ratioBefore
            const ratioBefore = await getAaveV3PositionRatio(positionOwner);
            console.log('ratioBefore', ratioBefore);

            // Get market address
            const marketAddr = addrs[network].AAVE_MARKET;

            console.log('ASSETS');
            // Get asset IDs
            const collAssetId = (await getAaveV3ReserveData(collAsset.address)).id;
            const debtAssetId = (await getAaveV3ReserveData(debtAsset.address)).id;

            const user = isEOA ? senderAcc.address : proxy.address;

            // Create subscription based on whether it's EOA or proxy
            const result = await subAaveV3LeverageManagementOnPriceGeneric(
                proxy,
                user,
                collAsset.address,
                collAssetId,
                debtAsset.address,
                debtAssetId,
                marketAddr,
                targetRatio,
                triggerPrice,
                priceState,
                bundleId,
            );
            const boostSubId = result.subId;
            const strategySub = result.strategySub;

            console.log('SUBBED !!!!');
            console.log(boostSubId, strategySub);

            const boostAmount = await fetchAmountInUSDPrice(debtAsset.symbol, boostAmountInUSD);
            console.log(boostAmount);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                debtAsset,
                collAsset,
                boostAmount,
                mockWrapper,
            );

            // Execute strategy
            if (isFLStrategy) {
                console.log('Executing FL Boost On Price strategy !!!!');
                await addBalancerFlLiquidity(debtAsset.address);
                await addBalancerFlLiquidity(collAsset.address);

                await callAaveV3GenericFLBoostOnPriceStrategy(
                    strategyExecutor,
                    1,
                    boostSubId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    flAddr,
                    debtAsset.address,
                );
            } else {
                await callAaveV3GenericBoostOnPriceStrategy(
                    strategyExecutor,
                    0,
                    boostSubId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                );
            }

            const ratioAfter = await getAaveV3PositionRatio(positionOwner);
            console.log('ratioAfter', ratioAfter);
            console.log('ratioBefore', ratioBefore);
            expect(ratioAfter).to.be.lt(ratioBefore);
        };

        const testPairs = AAVE_V3_AUTOMATION_TEST_PAIRS_BOOST[chainIds[network]] || [];
        for (let i = 0; i < testPairs.length; ++i) {
            const pair = testPairs[i];
            const collAsset = getAssetInfo(
                pair.collSymbol === 'ETH' ? 'WETH' : pair.collSymbol,
                chainIds[network],
            );
            const debtAsset = getAssetInfo(
                pair.debtSymbol === 'ETH' ? 'WETH' : pair.debtSymbol,
                chainIds[network],
            );

            it(`... should execute aaveV3 SW boost on price strategy (UNDER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = false;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_UNDER,
                    PRICE_STATE_UNDER,
                );
            });

            it(`... should execute aaveV3 SW boost on price strategy (OVER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = false;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_OVER,
                    PRICE_STATE_OVER,
                );
            });

            it(`... should execute aaveV3 SW FL boost on price strategy (UNDER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = true;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_UNDER,
                    PRICE_STATE_UNDER,
                );
            });

            it(`... should execute aaveV3 SW FL boost on price strategy (OVER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = true;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_OVER,
                    PRICE_STATE_OVER,
                );
            });

            it(`... should execute aaveV3 EOA boost on price strategy (UNDER) for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = false;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_UNDER,
                    PRICE_STATE_UNDER,
                );
            });

            it(`... should execute aaveV3 EOA boost on price strategy (OVER) for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = false;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_OVER,
                    PRICE_STATE_OVER,
                );
            });

            it(`... should execute aaveV3 EOA FL boost on price strategy (UNDER) for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = true;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_UNDER,
                    PRICE_STATE_UNDER,
                );
            });

            it(`... should execute aaveV3 EOA FL boost on price strategy (OVER) for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = true;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_OVER,
                    PRICE_STATE_OVER,
                );
            });
        }
    });
};

module.exports = {
    runBoostOnPriceTests,
};
