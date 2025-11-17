// Spark Close strategies
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
} = require('../../utils/utils');

const { addBotCaller } = require('../utils/utils-strategies');
const { subSparkCloseGeneric } = require('../utils/strategy-subs');
const {
    callSparkGenericFLCloseToCollStrategy,
    callSparkGenericFLCloseToDebtStrategy,
} = require('../utils/strategy-calls');
const {
    deploySparkCloseGenericBundle,
    openSparkProxyPosition,
    getSparkPositionRatio,
    SPARK_AUTOMATION_TEST_PAIRS,
    getSparkReserveDataFromPool,
} = require('../../utils/spark');
const { getCloseStrategyTypeName, getCloseStrategyConfigs } = require('../../utils/utils');

const runCloseTests = () => {
    describe('Spark Close To Debt Strategies Tests', () => {
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
            await redeploy('SparkQuotePriceRangeTrigger', isFork);

            bundleId = await deploySparkCloseGenericBundle();
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
            collAmountInUSD,
            debtAmountInUSD,
            stopLossPrice,
            stopLossType,
            takeProfitPrice,
            takeProfitType,
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

            const user = proxy.address;

            // Determine close strategy type based on parameters
            const closeStrategyType = automationSdk.utils.getCloseStrategyType(
                stopLossPrice,
                stopLossType,
                takeProfitPrice,
                takeProfitType,
            );

            // Create subscription based on whether it's EOA or proxy
            const result = await subSparkCloseGeneric(
                proxy,
                user,
                collAsset.address,
                collAssetId,
                debtAsset.address,
                debtAssetId,
                marketAddress,
                stopLossPrice,
                stopLossType,
                takeProfitPrice,
                takeProfitType,
                bundleId,
            );
            const repaySubId = result.subId;
            const strategySub = result.strategySub;

            // Determine if we're closing to debt or collateral based on strategy type
            const closeToDebt =
                closeStrategyType === automationSdk.enums.CloseStrategyType.TAKE_PROFIT_IN_DEBT ||
                closeStrategyType === automationSdk.enums.CloseStrategyType.STOP_LOSS_IN_DEBT ||
                closeStrategyType ===
                    automationSdk.enums.CloseStrategyType.TAKE_PROFIT_AND_STOP_LOSS_IN_DEBT ||
                closeStrategyType ===
                    automationSdk.enums.CloseStrategyType
                        .TAKE_PROFIT_IN_DEBT_AND_STOP_LOSS_IN_COLLATERAL;

            await addBalancerFlLiquidity(debtAsset.address);
            await addBalancerFlLiquidity(collAsset.address);

            if (closeToDebt) {
                // Close to debt: flash loan debt asset, sell collateral to repay
                const sellAmount = await fetchAmountInUSDPrice(collAsset.symbol, collAmountInUSD);
                const exchangeObject = await formatMockExchangeObjUsdFeed(
                    collAsset,
                    debtAsset,
                    sellAmount,
                    mockWrapper,
                );
                const flAmount = (await fetchAmountInUSDPrice(debtAsset.symbol, debtAmountInUSD))
                    .mul(hre.ethers.BigNumber.from(100))
                    .div(hre.ethers.BigNumber.from(99));

                await callSparkGenericFLCloseToDebtStrategy(
                    strategyExecutor,
                    0,
                    repaySubId,
                    strategySub,
                    exchangeObject,
                    flAmount,
                    flAddr,
                    marketAddress,
                );
            } else {
                // Close to collateral: flash loan collateral asset, sell to get debt asset
                const flAmount = (await fetchAmountInUSDPrice(collAsset.symbol, debtAmountInUSD))
                    .mul(hre.ethers.BigNumber.from(100))
                    .div(hre.ethers.BigNumber.from(99));
                const exchangeObject = await formatMockExchangeObjUsdFeed(
                    collAsset,
                    debtAsset,
                    flAmount,
                    mockWrapper,
                );

                await callSparkGenericFLCloseToCollStrategy(
                    strategyExecutor,
                    1,
                    repaySubId,
                    strategySub,
                    exchangeObject,
                    flAmount,
                    flAddr,
                    marketAddress,
                );
            }

            const ratioAfter = await getSparkPositionRatio(positionOwner, null, marketAddress);
            console.log('ratioAfter', ratioAfter);
            console.log('ratioBefore', ratioBefore);
            // ratio should be 0 at the end because position is closed
            expect(ratioAfter).to.be.eq(0);
        };

        const testPairs = SPARK_AUTOMATION_TEST_PAIRS || [];
        const closeStrategyConfigs = getCloseStrategyConfigs(automationSdk);

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

            const marketName = addrs[network].SPARK_MARKET;

            for (let j = 0; j < closeStrategyConfigs.length; ++j) {
                const config = closeStrategyConfigs[j];
                const strategyTypeName = automationSdk.utils.getCloseStrategyType(
                    config.stopLossPrice,
                    config.stopLossType,
                    config.takeProfitPrice,
                    config.takeProfitType,
                );

                // SW Tests
                it(`... should execute Spark SW Close (${getCloseStrategyTypeName(
                    strategyTypeName,
                )}) for ${pair.collSymbol} / ${
                    pair.debtSymbol
                } pair on Spark ${marketName}`, async () => {
                    console.log(`Testing SW Close strategy type: ${strategyTypeName}`);
                    await baseTest(
                        collAsset,
                        debtAsset,
                        pair.collAmountInUSD,
                        pair.debtAmountInUSD,
                        config.stopLossPrice,
                        config.stopLossType,
                        config.takeProfitPrice,
                        config.takeProfitType,
                        pair.marketAddr,
                    );
                });
            }
        }
    });
};

describe('Spark close strategies test', function () {
    this.timeout(80000);

    it('... test Spark close strategies', async () => {
        await runCloseTests();
    }).timeout(50000);
});

module.exports = {
    runCloseTests,
};
