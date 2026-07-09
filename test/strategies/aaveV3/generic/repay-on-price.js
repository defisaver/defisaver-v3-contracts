// AaveV3 Repay On Price strategies
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
    callAaveV3GenericRepayOnPriceStrategy,
    callAaveV3GenericFLRepayOnPriceStrategy,
} = require('../../utils/strategy-calls');
const {
    AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY,
    getAaveV3PositionRatio,
    deployAaveV3RepayOnPriceGenericBundle,
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

const runRepayOnPriceTests = () => {
    describe('AaveV3 Repay On Price Strategies Tests', () => {
        let env;

        before(async () => {
            env = await setupGenericTestEnv({
                // trigger reads SemiContinuousTracker from registry, so it has to be deployed
                extraRedeploys: ['SemiContinuousTracker', 'AaveV3QuotePriceTrigger'],
                deployBundleFn: deployAaveV3RepayOnPriceGenericBundle,
            });
        });

        useSnapshots();

        const baseTest = async ({ collAsset, debtAsset, pair, isEOA, isFLStrategy, trigger }) => {
            const { senderAcc, proxy, strategyExecutor, mockWrapper, flAddr, bundleId } = env;
            const {
                targetRatioRepay,
                collAmountInUSD,
                debtAmountInUSD,
                repayAmountInUSD,
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
                targetRatioRepay,
                trigger.triggerPrice,
                trigger.priceState,
                bundleId,
            );

            const repayAmount = await fetchAmountInUSDPrice(collAsset.symbol, repayAmountInUSD);
            const exchangeObject = await formatMockExchangeObjUsdFeed(
                collAsset,
                debtAsset,
                repayAmount,
                mockWrapper,
            );

            // Execute strategy
            if (isFLStrategy) {
                await addBalancerFlLiquidity(debtAsset.address);
                await addBalancerFlLiquidity(collAsset.address);

                await callAaveV3GenericFLRepayOnPriceStrategy(
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    flAddr,
                    marketAddr,
                );
            } else {
                await callAaveV3GenericRepayOnPriceStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    marketAddr,
                );
            }

            const ratioAfter = await getAaveV3PositionRatio(positionOwner, null, marketAddr);
            console.log('ratioAfter', ratioAfter);
            expect(ratioAfter).to.be.gt(ratioBefore);
        };

        const testPairs = AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY[chainIds[network]] || [];
        testPairs.forEach((pair) => {
            const { collAsset, debtAsset, marketName } = getTestPairInfo(pair);

            WALLET_TYPES.forEach(({ isEOA, label }) => {
                [false, true].forEach((isFLStrategy) => {
                    PASSING_PRICE_TRIGGERS.forEach((trigger) => {
                        const strategyName = `${label}${isFLStrategy ? ' FL' : ''} Repay on price`;
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
    runRepayOnPriceTests,
};
