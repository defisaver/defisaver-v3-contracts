// Spark Boost On Price strategy tests
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
    getStrategyExecutorContract,
    getAndSetMockExchangeWrapper,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    isNetworkFork,
    redeploy,
    sendEther,
    getContractFromRegistry,
} = require('../../utils/utils');

const { addBotCaller } = require('../utils/utils-strategies');
const { subSparkBoostOnPriceBundle } = require('../utils/strategy-subs');
const {
    callSparkBoostOnPriceStrategy,
    callSparkFLBoostOnPriceStrategy,
} = require('../utils/strategy-calls');
const {
    deploySparkBoostOnPriceBundle,
    openSparkProxyPosition,
    getSparkPositionRatio,
    getSparkReserveDataFromPool,
    SPARK_AUTOMATION_TEST_PAIRS_BOOST,
} = require('../../utils/spark');

const TRIGGER_PRICE_UNDER = 999_999;
const TRIGGER_PRICE_OVER = 0;
const PRICE_STATE_UNDER = automationSdk.enums.RatioState.UNDER;
const PRICE_STATE_OVER = automationSdk.enums.RatioState.OVER;

const runBoostOnPriceTests = () => {
    describe('Spark Boost On Price Strategy Tests', function () {
        this.timeout(1200000);

        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let mockWrapper;
        let bundleId;
        let flAddr;

        before(async () => {
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

            await redeploy('SparkTargetRatioCheck', isFork);

            bundleId = await deploySparkBoostOnPriceBundle();
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
            isFLStrategy,
            triggerPrice,
            priceState,
            marketAddress,
        ) => {
            const positionOwner = proxy.address;

            await openSparkProxyPosition(
                senderAcc.address,
                proxy,
                collAsset.symbol,
                debtAsset.symbol,
                collAmountInUSD,
                debtAmountInUSD,
                marketAddress,
            );

            // Check ratioBefore
            const ratioBefore = await getSparkPositionRatio(positionOwner, null, marketAddress);
            console.log('ratioBefore', ratioBefore);

            // Get asset IDs
            const collAssetId = (
                await getSparkReserveDataFromPool(collAsset.address, marketAddress)
            ).id;
            const debtAssetId = (
                await getSparkReserveDataFromPool(debtAsset.address, marketAddress)
            ).id;

            // Create subscription
            const result = await subSparkBoostOnPriceBundle(
                proxy,
                bundleId,
                collAsset.address,
                collAssetId,
                debtAsset.address,
                debtAssetId,
                marketAddress,
                triggerPrice,
                priceState,
                targetRatio,
            );
            const boostSubId = result.subId;
            const strategySub = result.strategySub;

            const boostAmount = await fetchAmountInUSDPrice(debtAsset.symbol, boostAmountInUSD);
            const exchangeObject = await formatMockExchangeObjUsdFeed(
                debtAsset,
                collAsset,
                boostAmount,
                mockWrapper,
            );

            // Execute strategy
            if (isFLStrategy) {
                await callSparkFLBoostOnPriceStrategy(
                    strategyExecutor,
                    1,
                    boostSubId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    debtAsset.address,
                    flAddr,
                );
            } else {
                await callSparkBoostOnPriceStrategy(
                    strategyExecutor,
                    0,
                    boostSubId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                );
            }

            const ratioAfter = await getSparkPositionRatio(positionOwner, null, marketAddress);
            console.log('ratioAfter', ratioAfter);
            console.log('ratioBefore', ratioBefore);
            expect(ratioAfter).to.be.lt(ratioBefore);
        };

        const testPairs = SPARK_AUTOMATION_TEST_PAIRS_BOOST || [];
        for (let i = 0; i < testPairs.length; ++i) {
            const pair = testPairs[i];
            const collAsset = getAssetInfo(pair.collSymbol, chainIds[network]);
            const debtAsset = getAssetInfo(pair.debtSymbol, chainIds[network]);

            it(`... should execute Spark Boost on price strategy (OVER) for ${pair.collSymbol} 
            / ${pair.debtSymbol} pair on Spark ${addrs[network].SPARK_MARKET}`, async () => {
                const isFLStrategy = false;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isFLStrategy,
                    TRIGGER_PRICE_OVER,
                    PRICE_STATE_OVER,
                    pair.marketAddr,
                );
            });

            it(`... should execute Spark Boost on price strategy (UNDER) for ${pair.collSymbol} 
            / ${pair.debtSymbol} pair on Spark ${addrs[network].SPARK_MARKET}`, async () => {
                const isFLStrategy = false;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isFLStrategy,
                    TRIGGER_PRICE_UNDER,
                    PRICE_STATE_UNDER,
                    pair.marketAddr,
                );
            });

            it(`... should execute Spark FL Boost on price strategy (OVER) for ${pair.collSymbol} 
            / ${pair.debtSymbol} pair on Spark ${addrs[network].SPARK_MARKET}`, async () => {
                const isFLStrategy = true;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isFLStrategy,
                    TRIGGER_PRICE_OVER,
                    PRICE_STATE_OVER,
                    pair.marketAddr,
                );
            });

            it(`... should execute Spark FL Boost on price strategy (UNDER) for ${pair.collSymbol} 
            / ${pair.debtSymbol} pair on Spark ${addrs[network].SPARK_MARKET}`, async () => {
                const isFLStrategy = true;

                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isFLStrategy,
                    TRIGGER_PRICE_UNDER,
                    PRICE_STATE_UNDER,
                    pair.marketAddr,
                );
            });
        }
    });
};

describe('Spark boost on price strategies test', function () {
    this.timeout(80000);

    it('... test Spark boost on price strategies', async () => {
        await runBoostOnPriceTests();
    }).timeout(50000);
});

module.exports = {
    runBoostOnPriceTests,
};
