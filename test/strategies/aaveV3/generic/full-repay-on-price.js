// AaveV3 Full Repay On Price strategies
// Almost identical to ./repay-on-price.js, but uses targetRatio = 0 for everything.
// With targetRatio 0 the strategy must fully repay the debt and leave the extra collateral
// in the position (AaveV3OpenRatioCheck requires the resulting ratio to be exactly 0).
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
    balanceOf,
} = require('../../../utils/utils');

const { addBotCaller } = require('../../utils/utils-strategies');
const { subAaveV3LeverageManagementOnPriceGeneric } = require('../../utils/strategy-subs');
const {
    callAaveV3GenericRepayOnPriceStrategy,
    callAaveV3GenericFLRepayOnPriceStrategy,
} = require('../../utils/strategy-calls');
const {
    openAaveV3ProxyPosition,
    openAaveV3EOAPosition,
    getAaveV3PositionRatio,
    deployAaveV3RepayOnPriceGenericBundle,
    setupAaveV3EOAPermissions,
    getAaveV3ReserveData,
} = require('../../../utils/aave');

const TRIGGER_PRICE_UNDER = 999_999;
const TRIGGER_PRICE_OVER = 0;
const PRICE_STATE_UNDER = automationSdk.enums.RatioState.UNDER;
const PRICE_STATE_OVER = automationSdk.enums.RatioState.OVER;

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
            // trigger reads SemiContinuousTracker from registry, so it has to be deployed
            await redeploy('SemiContinuousTracker', isFork);
            await redeploy('AaveV3QuotePriceTrigger', isFork);
            await redeploy('AaveV3Borrow', isFork);
            await redeploy('AaveV3Payback', isFork);
            await redeploy('AaveV3Supply', isFork);
            await redeploy('AaveV3Withdraw', isFork);
            await redeploy('AaveV3RatioCheck', isFork);
            await redeploy('AaveV3OpenRatioCheck', isFork);
            await redeploy('AaveV3View', isFork);
            await redeploy('SubProxy', isFork);

            bundleId = await deployAaveV3RepayOnPriceGenericBundle();
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
            isEOA,
            isFLStrategy,
            triggerPrice,
            priceState,
            marketAddress,
        ) => {
            const positionOwner = isEOA ? senderAcc.address : proxy.address;

            // Open position
            if (isEOA) {
                await openAaveV3EOAPosition(
                    senderAcc.address,
                    proxy,
                    collAsset.symbol,
                    debtAsset.symbol,
                    collAmountInUSD,
                    debtAmountInUSD,
                    marketAddress,
                );

                // EOA delegates to the actual Smart Wallet address that executes the strategy
                await setupAaveV3EOAPermissions(
                    senderAcc.address,
                    proxy.address, // The actual Smart Wallet executing address
                    collAsset.address,
                    debtAsset.address,
                    marketAddress,
                );
            } else {
                await openAaveV3ProxyPosition(
                    senderAcc.address,
                    proxy,
                    collAsset.symbol,
                    debtAsset.symbol,
                    collAmountInUSD,
                    debtAmountInUSD,
                    marketAddress,
                );
            }

            // Check ratioBefore
            const ratioBefore = await getAaveV3PositionRatio(positionOwner, null, marketAddress);
            console.log('ratioBefore', ratioBefore);

            // Get asset IDs
            const collAssetId = (await getAaveV3ReserveData(collAsset.address, marketAddress)).id;
            const debtAssetId = (await getAaveV3ReserveData(debtAsset.address, marketAddress)).id;

            const user = isEOA ? senderAcc.address : proxy.address;

            // Create subscription based on whether it's EOA or proxy
            const result = await subAaveV3LeverageManagementOnPriceGeneric(
                proxy,
                user,
                collAsset.address,
                collAssetId,
                debtAsset.address,
                debtAssetId,
                marketAddress,
                targetRatio,
                triggerPrice,
                priceState,
                bundleId,
            );
            const repaySubId = result.subId;
            const strategySub = result.strategySub;

            console.log('SUBBED !!!!');
            // console.log(repaySubId, strategySub);

            const repayAmount = await fetchAmountInUSDPrice(collAsset.symbol, repayAmountInUSD);
            console.log(repayAmount);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                collAsset,
                debtAsset,
                repayAmount,
                mockWrapper,
            );

            // Execute strategy
            if (isFLStrategy) {
                console.log('Executing FL Full Repay On Price strategy !!!!');
                await addBalancerFlLiquidity(debtAsset.address);
                await addBalancerFlLiquidity(collAsset.address);

                await callAaveV3GenericFLRepayOnPriceStrategy(
                    strategyExecutor,
                    1,
                    repaySubId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    flAddr,
                    marketAddress,
                );
            } else {
                await callAaveV3GenericRepayOnPriceStrategy(
                    strategyExecutor,
                    0,
                    repaySubId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    marketAddress,
                );
            }

            const ratioAfter = await getAaveV3PositionRatio(positionOwner, null, marketAddress);
            console.log('ratioAfter', ratioAfter);
            console.log('ratioBefore', ratioBefore);

            // Full repay: the strategy must leave the position with no debt, so the safety
            // ratio is exactly 0 (AaveV3OpenRatioCheck enforces this for targetRatio == 0).
            expect(ratioAfter).to.be.eq(0);

            // No debt should remain, while the leftover collateral stays in the position.
            const collReserve = await getAaveV3ReserveData(collAsset.address, marketAddress);
            const debtReserve = await getAaveV3ReserveData(debtAsset.address, marketAddress);
            const debtBalanceAfter = await balanceOf(
                debtReserve.variableDebtTokenAddress,
                positionOwner,
            );
            const collBalanceAfter = await balanceOf(collReserve.aTokenAddress, positionOwner);
            expect(debtBalanceAfter).to.be.eq(0);
            expect(collBalanceAfter).to.be.gt(0);
        };

        const testPairs = FULL_REPAY_TEST_PAIRS[chainIds[network]] || [];
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

            // Determine market name for test description
            const marketName =
                pair.marketAddr === addrs[network].AAVE_MARKET ? 'Core Market' : 'Prime Market';

            it(`... should execute aaveV3 SW Full Repay on price strategy (UNDER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                const isEOA = false;
                const isFLStrategy = false;

                await baseTest(
                    collAsset,
                    debtAsset,
                    FULL_REPAY_TARGET_RATIO,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    fullRepayAmountInUSD(pair.debtAmountInUSD),
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_UNDER,
                    PRICE_STATE_UNDER,
                    pair.marketAddr,
                );
            });

            it(`... should execute aaveV3 SW Full Repay on price strategy (OVER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                const isEOA = false;
                const isFLStrategy = false;

                await baseTest(
                    collAsset,
                    debtAsset,
                    FULL_REPAY_TARGET_RATIO,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    fullRepayAmountInUSD(pair.debtAmountInUSD),
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_OVER,
                    PRICE_STATE_OVER,
                    pair.marketAddr,
                );
            });

            it(`... should execute aaveV3 SW FL Full Repay on price strategy (UNDER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                const isEOA = false;
                const isFLStrategy = true;

                await baseTest(
                    collAsset,
                    debtAsset,
                    FULL_REPAY_TARGET_RATIO,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    fullRepayAmountInUSD(pair.debtAmountInUSD),
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_UNDER,
                    PRICE_STATE_UNDER,
                    pair.marketAddr,
                );
            });

            it(`... should execute aaveV3 SW FL Full Repay on price strategy (OVER) for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                const isEOA = false;
                const isFLStrategy = true;

                await baseTest(
                    collAsset,
                    debtAsset,
                    FULL_REPAY_TARGET_RATIO,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    fullRepayAmountInUSD(pair.debtAmountInUSD),
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_OVER,
                    PRICE_STATE_OVER,
                    pair.marketAddr,
                );
            });

            it(`... should execute aaveV3 EOA Full Repay on price strategy (UNDER) for ${pair.collSymbol} / ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                const isEOA = true;
                const isFLStrategy = false;

                await baseTest(
                    collAsset,
                    debtAsset,
                    FULL_REPAY_TARGET_RATIO,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    fullRepayAmountInUSD(pair.debtAmountInUSD),
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_UNDER,
                    PRICE_STATE_UNDER,
                    pair.marketAddr,
                );
            });

            it(`... should execute aaveV3 EOA Full Repay on price strategy (OVER) for ${pair.collSymbol} / ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                const isEOA = true;
                const isFLStrategy = false;

                await baseTest(
                    collAsset,
                    debtAsset,
                    FULL_REPAY_TARGET_RATIO,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    fullRepayAmountInUSD(pair.debtAmountInUSD),
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_OVER,
                    PRICE_STATE_OVER,
                    pair.marketAddr,
                );
            });

            it(`... should execute aaveV3 EOA FL Full Repay on price strategy (UNDER) for ${pair.collSymbol} / ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                const isEOA = true;
                const isFLStrategy = true;

                await baseTest(
                    collAsset,
                    debtAsset,
                    FULL_REPAY_TARGET_RATIO,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    fullRepayAmountInUSD(pair.debtAmountInUSD),
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_UNDER,
                    PRICE_STATE_UNDER,
                    pair.marketAddr,
                );
            });

            it(`... should execute aaveV3 EOA FL Full Repay on price strategy (OVER) for ${pair.collSymbol} / ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                const isEOA = true;
                const isFLStrategy = true;

                await baseTest(
                    collAsset,
                    debtAsset,
                    FULL_REPAY_TARGET_RATIO,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    fullRepayAmountInUSD(pair.debtAmountInUSD),
                    isEOA,
                    isFLStrategy,
                    TRIGGER_PRICE_OVER,
                    PRICE_STATE_OVER,
                    pair.marketAddr,
                );
            });
        }
    });
};

module.exports = {
    runFullRepayOnPriceTests,
};
