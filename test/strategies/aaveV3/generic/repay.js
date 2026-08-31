// AaveV3 Repay strategies
const { expect } = require('chai');

const {
    network,
    chainIds,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    addBalancerFlLiquidity,
} = require('../../../utils/utils');

const { subAaveV3LeverageManagementGeneric } = require('../../utils/strategy-subs');
const {
    callAaveV3GenericRepayStrategy,
    callAaveV3GenericFLRepayStrategy,
} = require('../../utils/strategy-calls');
const {
    AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY,
    getAaveV3PositionRatio,
    deployAaveV3RepayGenericBundle,
} = require('../../../utils/aave');
const {
    WALLET_TYPES,
    setupGenericTestEnv,
    useSnapshots,
    openAaveV3TestPosition,
    getTestPairInfo,
} = require('./common');

const RATIO_STATE = 1;

const runRepayTests = () => {
    describe('AaveV3 Repay Strategies Tests', () => {
        let env;

        before(async () => {
            env = await setupGenericTestEnv({
                extraRedeploys: ['AaveV3RatioTrigger', 'PullToken'],
                deployBundleFn: deployAaveV3RepayGenericBundle,
            });
        });

        useSnapshots();

        const baseTest = async ({ collAsset, debtAsset, pair, isEOA, isFLStrategy }) => {
            const { senderAcc, proxy, strategyExecutor, mockWrapper, flAddr, bundleId } = env;
            const {
                triggerRatioRepay,
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

            const { subId, strategySub } = await subAaveV3LeverageManagementGeneric(
                bundleId,
                proxy,
                senderAcc.address,
                marketAddr,
                RATIO_STATE,
                targetRatioRepay,
                triggerRatioRepay,
                isEOA,
            );

            const repayAmount = await fetchAmountInUSDPrice(collAsset.symbol, repayAmountInUSD);
            const exchangeObject = await formatMockExchangeObjUsdFeed(
                collAsset,
                debtAsset,
                repayAmount,
                mockWrapper,
            );

            // Execute strategy
            // TODO -> pass random params like placeholderAddr, to check if piping works
            if (isFLStrategy) {
                await addBalancerFlLiquidity(collAsset.address);
                await addBalancerFlLiquidity(debtAsset.address);

                await callAaveV3GenericFLRepayStrategy(
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
                await callAaveV3GenericRepayStrategy(
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
                    const strategyName = `${label}${isFLStrategy ? ' FL' : ''} repay`;
                    it(`... should execute aaveV3 ${strategyName} strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                        await baseTest({ collAsset, debtAsset, pair, isEOA, isFLStrategy });
                    });
                });
            });
        });
    });
};

module.exports = {
    runRepayTests,
};
