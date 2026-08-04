// AaveV3 Close strategies
const hre = require('hardhat');
const { expect } = require('chai');
const automationSdk = require('@defisaver/automation-sdk');

const {
    network,
    chainIds,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    addBalancerFlLiquidity,
    getCloseStrategyTypeName,
    getCloseStrategyConfigs,
    isCloseToDebtType,
} = require('../../../utils/utils');

const { subAaveV3CloseGeneric } = require('../../utils/strategy-subs');
const {
    callAaveV3GenericFLCloseToCollStrategy,
    callAaveV3GenericFLCloseToDebtStrategy,
} = require('../../utils/strategy-calls');
const {
    AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY,
    getAaveV3PositionRatio,
    deployAaveV3CloseGenericBundle,
    getAaveV3ReserveData,
} = require('../../../utils/aave');
const {
    WALLET_TYPES,
    setupGenericTestEnv,
    useSnapshots,
    openAaveV3TestPosition,
    getTestPairInfo,
} = require('./common');

const runCloseTests = () => {
    describe('AaveV3 Close to debt Strategies take', () => {
        let env;

        before(async () => {
            env = await setupGenericTestEnv({
                // triggers read SemiContinuousTracker from registry, so it has to be deployed
                extraRedeploys: [
                    'SemiContinuousTracker',
                    'AaveV3QuotePriceTrigger',
                    'AaveV3QuotePriceRangeTrigger',
                    'SendTokenAndUnwrap',
                    'SendTokensAndUnwrap',
                ],
                deployBundleFn: deployAaveV3CloseGenericBundle,
            });
        });

        useSnapshots();

        const baseTest = async ({ collAsset, debtAsset, pair, config, isEOA }) => {
            const { senderAcc, proxy, strategyExecutor, mockWrapper, flAddr, bundleId } = env;
            const { collAmountInUSD, debtAmountInUSD, marketAddr } = pair;
            const { stopLossPrice, stopLossType, takeProfitPrice, takeProfitType } = config;
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

            // Determine close strategy type based on parameters
            const closeStrategyType = automationSdk.utils.getCloseStrategyType(
                stopLossPrice,
                stopLossType,
                takeProfitPrice,
                takeProfitType,
            );
            const closeToDebt = isCloseToDebtType(automationSdk, closeStrategyType);

            const { subId, strategySub } = await subAaveV3CloseGeneric(
                proxy,
                positionOwner,
                collAsset.address,
                collAssetId,
                debtAsset.address,
                debtAssetId,
                marketAddr,
                stopLossPrice,
                stopLossType,
                takeProfitPrice,
                takeProfitType,
                bundleId,
            );

            // Execute strategy (always with flash loan)
            console.log(
                'Executing FL Close strategy with type:',
                closeStrategyType,
                'closeToDebt:',
                closeToDebt,
            );
            await addBalancerFlLiquidity(debtAsset.address);
            await addBalancerFlLiquidity(collAsset.address);

            // Close to debt: flash loan debt asset and sell collateral to repay it.
            // Close to collateral: flash loan collateral asset and sell it for debt asset.
            // Either way the flash loan covers the whole debt, +1% buffer
            const flAsset = closeToDebt ? debtAsset : collAsset;
            const flAmount = (await fetchAmountInUSDPrice(flAsset.symbol, debtAmountInUSD))
                .mul(hre.ethers.BigNumber.from(100))
                .div(hre.ethers.BigNumber.from(99));
            const sellAmount = closeToDebt
                ? await fetchAmountInUSDPrice(collAsset.symbol, collAmountInUSD)
                : flAmount;
            const exchangeObject = await formatMockExchangeObjUsdFeed(
                collAsset,
                debtAsset,
                sellAmount,
                mockWrapper,
            );

            const callStrategy = closeToDebt
                ? callAaveV3GenericFLCloseToDebtStrategy
                : callAaveV3GenericFLCloseToCollStrategy;
            await callStrategy(
                strategyExecutor,
                closeToDebt ? 0 : 1,
                subId,
                strategySub,
                exchangeObject,
                flAmount,
                flAddr,
                marketAddr,
            );

            const ratioAfter = await getAaveV3PositionRatio(positionOwner, null, marketAddr);
            console.log('ratioAfter', ratioAfter);
            // ratio should be 0 at the end because position is closed
            expect(ratioAfter).to.be.eq(0);
        };

        const testPairs = AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY[chainIds[network]] || [];
        const closeStrategyConfigs = getCloseStrategyConfigs(automationSdk);

        testPairs.forEach((pair) => {
            const { collAsset, debtAsset, marketName } = getTestPairInfo(pair);

            closeStrategyConfigs.forEach((config) => {
                const strategyTypeName = automationSdk.utils.getCloseStrategyType(
                    config.stopLossPrice,
                    config.stopLossType,
                    config.takeProfitPrice,
                    config.takeProfitType,
                );

                WALLET_TYPES.forEach(({ isEOA, label }) => {
                    it(`... should execute aaveV3 ${label} Close (${getCloseStrategyTypeName(
                        strategyTypeName,
                    )}) for ${pair.collSymbol} / ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                        console.log(`Testing ${label} Close strategy type: ${strategyTypeName}`);
                        await baseTest({ collAsset, debtAsset, pair, config, isEOA });
                    });
                });
            });
        });
    });
};

module.exports = {
    runCloseTests,
};
