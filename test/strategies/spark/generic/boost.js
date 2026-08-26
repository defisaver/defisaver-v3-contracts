// Spark Generic Boost strategies
const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');

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
const { subSparkLeverageManagementGeneric } = require('../../utils/strategy-subs');
const {
    callSparkGenericBoostStrategy,
    callSparkGenericFLBoostStrategy,
} = require('../../utils/strategy-calls');
const {
    SPARK_AUTOMATION_TEST_PAIRS_BOOST,
    openSparkProxyPosition,
    openSparkEOAPosition,
    getSparkPositionRatio,
    deploySparkBoostGenericBundle,
    setupSparkEOAPermissions,
    mockSparkOracle,
} = require('../../../utils/spark');

const RATIO_STATE_BOOST = 0; // OVER - boost fires when ratio is ABOVE trigger

const runBoostTests = () => {
    describe('Spark Generic Boost Strategies Tests', function () {
        this.timeout(600000);
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let mockWrapper;
        let flAddr;
        let bundleId;

        before(async () => {
            const isFork = isNetworkFork();
            await hre.network.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            // Must run BEFORE any redeploys: redeploy() time travels (registry wait
            // period) which makes Spark's price feeds stale and every pool
            // operation reverts with CanNotPickMedianOfEmptyArray (0x9e198af9).
            await mockSparkOracle();

            await sendEther(senderAcc, addrs[network].OWNER_ACC, '10');
            proxy = await getProxy(senderAcc.address);
            await addBotCaller(botAcc.address, isFork);
            strategyExecutor = (await getStrategyExecutorContract()).connect(botAcc);
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);

            const flContract = await getContractFromRegistry('FLAction', isFork);
            flAddr = flContract.address;

            await redeploy('SparkRatioTrigger', isFork);
            await redeploy('SparkBorrow', isFork);
            await redeploy('SparkSupply', isFork);
            await redeploy('SparkRatioCheck', isFork);
            await redeploy('SparkView', isFork);

            bundleId = await deploySparkBoostGenericBundle();
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
            triggerRatioBoost,
            targetRatioBoost,
            collAmountInUSD,
            debtAmountInUSD,
            boostAmountInUSD,
            isEOA,
            isFLStrategy,
            marketAddress,
        ) => {
            const marketAddr = marketAddress || addrs[network].SPARK_MARKET;
            const positionOwner = isEOA ? senderAcc.address : proxy.address;

            if (isEOA) {
                await openSparkEOAPosition(
                    senderAcc.address,
                    proxy,
                    collAsset.symbol,
                    debtAsset.symbol,
                    collAmountInUSD,
                    debtAmountInUSD,
                    marketAddr,
                );
                await setupSparkEOAPermissions(
                    senderAcc.address,
                    proxy.address,
                    collAsset.address,
                    debtAsset.address,
                    marketAddr,
                );
            } else {
                await openSparkProxyPosition(
                    senderAcc.address,
                    proxy,
                    collAsset.symbol,
                    debtAsset.symbol,
                    collAmountInUSD,
                    debtAmountInUSD,
                    marketAddr,
                );
            }

            const ratioBefore = await getSparkPositionRatio(positionOwner, null, marketAddr);

            const { subId, strategySub } = await subSparkLeverageManagementGeneric(
                bundleId,
                proxy,
                senderAcc.address,
                marketAddr,
                RATIO_STATE_BOOST,
                targetRatioBoost,
                triggerRatioBoost,
                isEOA,
            );

            // boost amount is in DEBT token, exchange goes debt -> coll
            const boostAmount = await fetchAmountInUSDPrice(debtAsset.symbol, boostAmountInUSD);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                debtAsset, // src = debt
                collAsset, // dest = coll
                boostAmount,
                mockWrapper,
            );

            if (isFLStrategy) {
                await addBalancerFlLiquidity(debtAsset.address);
                await addBalancerFlLiquidity(collAsset.address);

                await callSparkGenericFLBoostStrategy(
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    flAddr,
                    marketAddr,
                );
            } else {
                await callSparkGenericBoostStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    marketAddr,
                );
            }

            const ratioAfter = await getSparkPositionRatio(positionOwner, null, marketAddr);
            console.log('ratioBefore', ratioBefore.toString());
            console.log('ratioAfter', ratioAfter.toString());
            // boost increases leverage -> ratio goes DOWN
            expect(ratioAfter).to.be.lt(ratioBefore);
        };

        const testPairs = SPARK_AUTOMATION_TEST_PAIRS_BOOST;
        for (let i = 0; i < testPairs.length; i++) {
            const pair = testPairs[i];
            const collAsset = getAssetInfo(
                pair.collSymbol === 'ETH' ? 'WETH' : pair.collSymbol,
                chainIds[network],
            );
            const debtAsset = getAssetInfo(
                pair.debtSymbol === 'ETH' ? 'WETH' : pair.debtSymbol,
                chainIds[network],
            );

            it(`... should execute Spark SW boost strategy for ${pair.collSymbol}/${pair.debtSymbol}`, async () => {
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioBoost,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    false,
                    false,
                    pair.marketAddr,
                );
            });
            it(`... should execute Spark SW FL boost strategy for ${pair.collSymbol}/${pair.debtSymbol}`, async () => {
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioBoost,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    false,
                    true,
                    pair.marketAddr,
                );
            });
            it(`... should execute Spark EOA boost strategy for ${pair.collSymbol}/${pair.debtSymbol}`, async () => {
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioBoost,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    true,
                    false,
                    pair.marketAddr,
                );
            });
            it(`... should execute Spark EOA FL boost strategy for ${pair.collSymbol}/${pair.debtSymbol}`, async () => {
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioBoost,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    true,
                    true,
                    pair.marketAddr,
                );
            });
        }
    });
};

module.exports = { runBoostTests };
