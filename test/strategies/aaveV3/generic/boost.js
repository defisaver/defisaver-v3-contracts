// AaveV3 Boost strategies
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
    callAaveV3GenericBoostStrategy,
    callAaveV3GenericFLBoostStrategy,
} = require('../../utils/strategy-calls');
const {
    AAVE_V3_AUTOMATION_TEST_PAIRS_BOOST,
    getAaveV3PositionRatio,
    deployAaveV3BoostGenericBundle,
} = require('../../../utils/aave');
const {
    WALLET_TYPES,
    setupGenericTestEnv,
    useSnapshots,
    openAaveV3TestPosition,
    getTestPairInfo,
} = require('./common');

const RATIO_STATE = 0;

const runBoostTests = () => {
    describe('AaveV3 Boost Strategies Tests', () => {
        let env;

        before(async () => {
            env = await setupGenericTestEnv({
                extraRedeploys: ['AaveV3RatioTrigger'],
                deployBundleFn: deployAaveV3BoostGenericBundle,
            });
        });

        useSnapshots();

        const baseTest = async ({ collAsset, debtAsset, pair, isEOA, isFLStrategy }) => {
            const { senderAcc, proxy, strategyExecutor, mockWrapper, flAddr, bundleId } = env;
            const {
                triggerRatioBoost,
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

            const { subId, strategySub } = await subAaveV3LeverageManagementGeneric(
                bundleId,
                proxy,
                senderAcc.address,
                marketAddr,
                RATIO_STATE, // ratio state for boost !
                targetRatioBoost,
                triggerRatioBoost,
                isEOA,
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

                await callAaveV3GenericFLBoostStrategy(
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    flAddr,
                    debtAsset.address,
                    collAsset.address,
                    marketAddr,
                );
            } else {
                await callAaveV3GenericBoostStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    marketAddr,
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
                    const strategyName = `${label}${isFLStrategy ? ' FL' : ''} boost`;
                    it(`... should execute aaveV3 ${strategyName} strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                        await baseTest({ collAsset, debtAsset, pair, isEOA, isFLStrategy });
                    });
                });
            });
        });
    });
};

module.exports = {
    runBoostTests,
};
