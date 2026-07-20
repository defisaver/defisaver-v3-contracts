// AaveV3 Full Repay On Price strategies
// Almost identical to ./repay-on-price.js, but uses targetRatio = 0 for everything.
// With targetRatio 0 the strategy must fully repay the debt and leave the extra collateral
// in the position (AaveV3OpenRatioCheck requires the resulting ratio to be exactly 0).
const { expect } = require('chai');

const {
    network,
    addrs,
    chainIds,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    addBalancerFlLiquidity,
    balanceOf,
} = require('../../../utils/utils');

const { subAaveV3LeverageManagementOnPriceGeneric } = require('../../utils/strategy-subs');
const {
    callAaveV3GenericRepayOnPriceStrategy,
    callAaveV3GenericFLRepayOnPriceStrategy,
} = require('../../utils/strategy-calls');
const {
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

// Full repay => target ratio is 0 (leave position with no debt).
const FULL_REPAY_TARGET_RATIO = 0;

// Amount of collateral to repay with, derived from the debt: 10% more than the debt so it
// comfortably covers the whole debt (+ fee). Aave caps the payback at the actual debt.
const fullRepayAmountInUSD = (debtAmountInUSD) => Math.floor(debtAmountInUSD * 1.1);

// Dedicated low-leverage pairs for the full repay flow.
// The (non-FL) repay-on-price recipe withdraws collateral BEFORE paying back the debt, so the
// repay amount of collateral must be withdrawable while the full debt is still outstanding
// without breaching Aave's health factor. We therefore use a small debt relative to the
// collateral so the repay amount (debt + 10%) can be withdrawn while the position stays healthy.
const FULL_REPAY_TEST_PAIRS = {
    1: [
        // Core Market pairs
        {
            collSymbol: 'WETH',
            debtSymbol: 'DAI',
            marketAddr: addrs[network].AAVE_MARKET,
            collAmountInUSD: 50_000,
            debtAmountInUSD: 8_000,
        },
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
            marketAddr: addrs[network].AAVE_MARKET,
            collAmountInUSD: 50_000,
            debtAmountInUSD: 8_000,
        },
        {
            collSymbol: 'WBTC',
            debtSymbol: 'USDC',
            marketAddr: addrs[network].AAVE_MARKET,
            collAmountInUSD: 50_000,
            debtAmountInUSD: 8_000,
        },
        // Prime Market pair
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
            marketAddr: addrs[network].AAVE_V3_PRIME_MARKET,
            collAmountInUSD: 50_000,
            debtAmountInUSD: 8_000,
        },
    ],
};

const runFullRepayOnPriceTests = () => {
    describe('AaveV3 Full Repay On Price Strategies Tests', () => {
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
            const { collAmountInUSD, debtAmountInUSD, marketAddr } = pair;
            const repayAmountInUSD = fullRepayAmountInUSD(debtAmountInUSD);
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

            const collReserve = await getAaveV3ReserveData(collAsset.address, marketAddr);
            const debtReserve = await getAaveV3ReserveData(debtAsset.address, marketAddr);

            const { subId, strategySub } = await subAaveV3LeverageManagementOnPriceGeneric(
                proxy,
                positionOwner,
                collAsset.address,
                collReserve.id,
                debtAsset.address,
                debtReserve.id,
                marketAddr,
                FULL_REPAY_TARGET_RATIO,
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

            // Full repay: the strategy must leave the position with no debt, so the safety
            // ratio is exactly 0 (AaveV3OpenRatioCheck enforces this for targetRatio == 0).
            expect(ratioAfter).to.be.eq(0);

            // No debt should remain, while the leftover collateral stays in the position.
            const debtBalanceAfter = await balanceOf(
                debtReserve.variableDebtTokenAddress,
                positionOwner,
            );
            const collBalanceAfter = await balanceOf(collReserve.aTokenAddress, positionOwner);
            expect(debtBalanceAfter).to.be.eq(0);
            expect(collBalanceAfter).to.be.gt(0);
        };

        const testPairs = FULL_REPAY_TEST_PAIRS[chainIds[network]] || [];
        testPairs.forEach((pair) => {
            const { collAsset, debtAsset, marketName } = getTestPairInfo(pair);

            WALLET_TYPES.forEach(({ isEOA, label }) => {
                [false, true].forEach((isFLStrategy) => {
                    PASSING_PRICE_TRIGGERS.forEach((trigger) => {
                        const name = `${label}${isFLStrategy ? ' FL' : ''} Full Repay on price`;
                        it(`... should execute aaveV3 ${name} strategy (${trigger.state}) for ${pair.collSymbol} / ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
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
    runFullRepayOnPriceTests,
};
