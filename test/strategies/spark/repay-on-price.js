// Spark Repay On Price strategy tests
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
const { subSparkRepayOnPriceBundle } = require('../utils/strategy-subs');
const {
    callSparkRepayOnPriceStrategy,
    callSparkFLRepayOnPriceStrategy,
} = require('../utils/strategy-calls');
const {
    deploySparkRepayOnPriceBundle,
    openSparkProxyPosition,
    getSparkPositionRatio,
    getSparkReserveDataFromPool,
    SPARK_AUTOMATION_TEST_PAIRS_REPAY,
} = require('../../utils/spark');

const TRIGGER_PRICE_UNDER = 999_999;
const TRIGGER_PRICE_OVER = 0;
const PRICE_STATE_UNDER = automationSdk.enums.RatioState.UNDER;
const PRICE_STATE_OVER = automationSdk.enums.RatioState.OVER;

describe('Spark Repay On Price Strategy Tests', function () {
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

        bundleId = await deploySparkRepayOnPriceBundle();
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
        repayAmountInUSD,
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
        const collAssetId = (await getSparkReserveDataFromPool(collAsset.address, marketAddress))
            .id;
        const debtAssetId = (await getSparkReserveDataFromPool(debtAsset.address, marketAddress))
            .id;

        // Create subscription
        const result = await subSparkRepayOnPriceBundle(
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
        const repaySubId = result.subId;
        const strategySub = result.strategySub;

        const repayAmount = await fetchAmountInUSDPrice(collAsset.symbol, repayAmountInUSD);
        const exchangeObject = await formatMockExchangeObjUsdFeed(
            collAsset,
            debtAsset,
            repayAmount,
            mockWrapper,
        );

        // Execute strategy
        if (isFLStrategy) {
            await callSparkFLRepayOnPriceStrategy(
                strategyExecutor,
                1,
                repaySubId,
                strategySub,
                exchangeObject,
                repayAmount,
                collAsset.address,
                flAddr,
            );
        } else {
            await callSparkRepayOnPriceStrategy(
                strategyExecutor,
                0,
                repaySubId,
                strategySub,
                exchangeObject,
                repayAmount,
            );
        }

        const ratioAfter = await getSparkPositionRatio(positionOwner, null, marketAddress);
        console.log('ratioAfter', ratioAfter);
        console.log('ratioBefore', ratioBefore);
        expect(ratioAfter).to.be.gt(ratioBefore);
    };

    const testPairs = SPARK_AUTOMATION_TEST_PAIRS_REPAY || [];
    for (let i = 0; i < testPairs.length; ++i) {
        const pair = testPairs[i];
        const collAsset = getAssetInfo(pair.collSymbol, chainIds[network]);
        const debtAsset = getAssetInfo(pair.debtSymbol, chainIds[network]);

        it(`... should execute Spark Repay on price strategy (UNDER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on Spark ${addrs[network].SPARK_MARKET}`, async () => {
            const isFLStrategy = false;

            await baseTest(
                collAsset,
                debtAsset,
                pair.targetRatioRepay,
                pair.collAmountInUSD,
                pair.debtAmountInUSD,
                pair.repayAmountInUSD,
                isFLStrategy,
                TRIGGER_PRICE_UNDER,
                PRICE_STATE_UNDER,
                pair.marketAddr,
            );
        });

        it(`... should execute Spark Repay on price strategy (OVER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on Spark ${addrs[network].SPARK_MARKET}`, async () => {
            const isFLStrategy = false;

            await baseTest(
                collAsset,
                debtAsset,
                pair.targetRatioRepay,
                pair.collAmountInUSD,
                pair.debtAmountInUSD,
                pair.repayAmountInUSD,
                isFLStrategy,
                TRIGGER_PRICE_OVER,
                PRICE_STATE_OVER,
                pair.marketAddr,
            );
        });

        it(`... should execute Spark FL Repay on price strategy (UNDER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on Spark ${addrs[network].SPARK_MARKET}`, async () => {
            const isFLStrategy = true;

            await baseTest(
                collAsset,
                debtAsset,
                pair.targetRatioRepay,
                pair.collAmountInUSD,
                pair.debtAmountInUSD,
                pair.repayAmountInUSD,
                isFLStrategy,
                TRIGGER_PRICE_UNDER,
                PRICE_STATE_UNDER,
                pair.marketAddr,
            );
        });

        it(`... should execute Spark FL Repay on price strategy (OVER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on Spark ${addrs[network].SPARK_MARKET}`, async () => {
            const isFLStrategy = true;

            await baseTest(
                collAsset,
                debtAsset,
                pair.targetRatioRepay,
                pair.collAmountInUSD,
                pair.debtAmountInUSD,
                pair.repayAmountInUSD,
                isFLStrategy,
                TRIGGER_PRICE_OVER,
                PRICE_STATE_OVER,
                pair.marketAddr,
            );
        });
    }
});
