// AaveV3 Boost On Price strategies
const { expect } = require('chai');

const {
    network,
    chainIds,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    addBalancerFlLiquidity,
} = require('../../../utils/utils');

const { subAaveV3LeverageManagementOnPriceGeneric } = require('../../utils/strategy-subs');
const {
    callAaveV3GenericBoostOnPriceStrategy,
    callAaveV3GenericFLBoostOnPriceStrategy,
} = require('../../utils/strategy-calls');
const {
    AAVE_V3_AUTOMATION_TEST_PAIRS_BOOST,
    getAaveV3PositionRatio,
    deployAaveV3BoostOnPriceGenericBundle,
    getAaveV3ReserveData,
} = require('../../../utils/aave');
const {
    WALLET_TYPES,
    PASSING_PRICE_TRIGGERS,
    setupGenericTestEnv,
    useSnapshots,
    openAaveV3TestPosition,
    getTestPairInfo,
} = require('./common');

const runBoostOnPriceTests = () => {
    describe('AaveV3 Boost On Price Strategies Tests', () => {
        let env;

        before(async () => {
            env = await setupGenericTestEnv({
                // trigger reads SemiContinuousTracker from registry, so it has to be deployed
                extraRedeploys: ['SemiContinuousTracker', 'AaveV3QuotePriceTrigger'],
                deployBundleFn: deployAaveV3BoostOnPriceGenericBundle,
            });
        });

        useSnapshots();

        const baseTest = async ({ collAsset, debtAsset, pair, isEOA, isFLStrategy, trigger }) => {
            const { senderAcc, proxy, strategyExecutor, mockWrapper, flAddr, bundleId } = env;
            const {
                targetRatioBoost,
                collAmountInUSD,
                debtAmountInUSD,
                boostAmountInUSD,
                marketAddr,
            } = pair;
            const positionOwner = isEOA ? senderAcc.address : proxy.address;

            await openAaveV3TestPosition({
                isEOA,
                senderAcc,
                proxy,
                collAsset,
                debtAsset,
                collAmountInUSD,
                debtAmountInUSD,
                marketAddress: marketAddr,
            });

            const ratioBefore = await getAaveV3PositionRatio(positionOwner, null, marketAddr);
            console.log('ratioBefore', ratioBefore);

            const collAssetId = (await getAaveV3ReserveData(collAsset.address, marketAddr)).id;
            const debtAssetId = (await getAaveV3ReserveData(debtAsset.address, marketAddr)).id;

            const { subId, strategySub } = await subAaveV3LeverageManagementOnPriceGeneric(
                proxy,
                positionOwner,
                collAsset.address,
                collAssetId,
                debtAsset.address,
                debtAssetId,
                marketAddr,
                targetRatioBoost,
                trigger.triggerPrice,
                trigger.priceState,
                bundleId,
            );

            const boostAmount = await fetchAmountInUSDPrice(debtAsset.symbol, boostAmountInUSD);
            const exchangeObject = await formatMockExchangeObjUsdFeed(
                debtAsset,
                collAsset,
                boostAmount,
                mockWrapper,
            );

            // Execute strategy
            if (isFLStrategy) {
                await addBalancerFlLiquidity(debtAsset.address);
                await addBalancerFlLiquidity(collAsset.address);

                await callAaveV3GenericFLBoostOnPriceStrategy(
                    strategyExecutor,
                    1,
                    subId,
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
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                );
            }

            const ratioAfter = await getAaveV3PositionRatio(positionOwner, null, marketAddr);
            console.log('ratioAfter', ratioAfter);
            expect(ratioAfter).to.be.lt(ratioBefore);
        };

        const testPairs = AAVE_V3_AUTOMATION_TEST_PAIRS_BOOST[chainIds[network]] || [];
        testPairs.forEach((pair) => {
            const { collAsset, debtAsset, marketName } = getTestPairInfo(pair);

            WALLET_TYPES.forEach(({ isEOA, label }) => {
                [false, true].forEach((isFLStrategy) => {
                    PASSING_PRICE_TRIGGERS.forEach((trigger) => {
                        const strategyName = `${label}${isFLStrategy ? ' FL' : ''} boost on price`;
                        it(`... should execute aaveV3 ${strategyName} strategy (${trigger.state}) for ${pair.collSymbol} / ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                            await baseTest({
                                collAsset,
                                debtAsset,
                                pair,
                                isEOA,
                                isFLStrategy,
                                trigger,
                            });
                        });
                    });
                });
            });
        });
    });
};

module.exports = {
    runBoostOnPriceTests,
};
