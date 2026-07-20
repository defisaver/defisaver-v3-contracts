// AaveV3 Semi-Continuous Close strategies
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
    getAddrFromRegistry,
    balanceOf,
    nullAddress,
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

const runSemiContinuousCloseTests = () => {
    describe('AaveV3 Semi-Continuous Close Strategies', () => {
        let env;
        let semiContinuousTracker;
        let subStorage;

        before(async () => {
            env = await setupGenericTestEnv({
                extraRedeploys: [
                    // RecipeExecutor with semi-continuous support + the tracker it reads
                    // from registry (the close triggers read the tracker too)
                    'RecipeExecutor',
                    'SemiContinuousTracker',
                    'AaveV3QuotePriceTrigger',
                    'AaveV3QuotePriceRangeTrigger',
                    'SendTokenAndUnwrap',
                    'SendTokensAndUnwrap',
                ],
                deployBundleFn: deployAaveV3CloseGenericBundle,
            });
            semiContinuousTracker = env.contracts.SemiContinuousTracker;
            subStorage = await hre.ethers.getContractAt(
                'SubStorage',
                await getAddrFromRegistry('SubStorage'),
            );
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

            // Get reserve data (asset ids + aToken/variableDebtToken addrs for position tracking)
            const collReserveData = await getAaveV3ReserveData(collAsset.address, marketAddr);
            const debtReserveData = await getAaveV3ReserveData(debtAsset.address, marketAddr);

            // Determine close strategy type based on parameters
            const closeStrategyType = automationSdk.utils.getCloseStrategyType(
                stopLossPrice,
                stopLossType,
                takeProfitPrice,
                takeProfitType,
            );
            const closeToDebt = isCloseToDebtType(automationSdk, closeStrategyType);
            console.log('Close strategy type:', closeStrategyType, 'closeToDebt:', closeToDebt);

            const { subId, strategySub } = await subAaveV3CloseGeneric(
                proxy,
                positionOwner,
                collAsset.address,
                collReserveData.id,
                debtAsset.address,
                debtReserveData.id,
                marketAddr,
                stopLossPrice,
                stopLossType,
                takeProfitPrice,
                takeProfitType,
                bundleId,
            );

            await addBalancerFlLiquidity(debtAsset.address);
            await addBalancerFlLiquidity(collAsset.address);

            const logPositionState = async (label) => {
                const collBalance = await balanceOf(collReserveData.aTokenAddress, positionOwner);
                const debtBalance = await balanceOf(
                    debtReserveData.variableDebtTokenAddress,
                    positionOwner,
                );
                const ratio = await getAaveV3PositionRatio(positionOwner, null, marketAddr);
                console.log(`---------------- ${label} ----------------`);
                console.log(
                    `COLL LEFT IN POSITION: ${hre.ethers.utils.formatUnits(
                        collBalance,
                        collAsset.decimals,
                    )} ${collAsset.symbol}`,
                );
                console.log(
                    `DEBT LEFT IN POSITION: ${hre.ethers.utils.formatUnits(
                        debtBalance,
                        debtAsset.decimals,
                    )} ${debtAsset.symbol}`,
                );
                console.log(`RATIO: ${ratio}`);
                return { collBalance, debtBalance, ratio };
            };

            const verifyTrackerAndSubState = async (expectedWallet, expectedIsEnabled) => {
                const executionWallet = await semiContinuousTracker.executionWalletOf(subId);
                const storedSub = await subStorage.getSub(subId);
                console.log(`TRACKER EXECUTION WALLET FOR SUB ${subId}: ${executionWallet}`);
                console.log(`SUB ENABLED: ${storedSub.isEnabled}`);
                expect(executionWallet.toLowerCase()).to.be.eq(expectedWallet.toLowerCase());
                expect(storedSub.isEnabled).to.be.eq(expectedIsEnabled);
            };

            // Executes one strategy run (always with flash loan). When partialCloseUsdAmount
            // is set it's a semi-continuous partial execution: only that USD amount of debt is
            // repaid and the extra actionsCallData element tells RecipeExecutor to keep the
            // sub active and track the executing wallet
            const callCloseStrategy = async (partialCloseUsdAmount) => {
                const isPartial = !!partialCloseUsdAmount;
                const partialClose = isPartial
                    ? {
                          paybackAmount: await fetchAmountInUSDPrice(
                              debtAsset.symbol,
                              partialCloseUsdAmount,
                          ),
                          // pull 3% more collateral than debt repaid so the sale covers
                          // FL repayment + gas fee, leftovers are sent to the user
                          pullAmount: await fetchAmountInUSDPrice(
                              collAsset.symbol,
                              Math.round(partialCloseUsdAmount * 1.03),
                          ),
                      }
                    : null;

                // Close to debt: flash loan debt asset and sell collateral to repay it.
                // Close to collateral: flash loan collateral asset and sell it for debt asset.
                // Either way the flash loan covers the debt being repaid, +1% buffer
                const flAsset = closeToDebt ? debtAsset : collAsset;
                const flAmount = (
                    await fetchAmountInUSDPrice(
                        flAsset.symbol,
                        isPartial ? partialCloseUsdAmount : debtAmountInUSD,
                    )
                )
                    .mul(hre.ethers.BigNumber.from(100))
                    .div(hre.ethers.BigNumber.from(99));

                let sellAmount = flAmount;
                if (closeToDebt) {
                    sellAmount = isPartial
                        ? partialClose.pullAmount
                        : await fetchAmountInUSDPrice(collAsset.symbol, collAmountInUSD);
                }
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
                    { partialClose },
                );
            };

            // One partial execution: repays part of the debt, the sub must stay active
            // and the tracker must remember the executing wallet
            const executePartialClose = async (label, partialCloseUsdAmount, stateBefore) => {
                console.log(`>>>>>> ${label}`);
                await callCloseStrategy(partialCloseUsdAmount);
                const stateAfter = await logPositionState(`AFTER ${label}`);
                console.log(
                    `REPAID: ${hre.ethers.utils.formatUnits(
                        stateBefore.debtBalance.sub(stateAfter.debtBalance),
                        debtAsset.decimals,
                    )} ${debtAsset.symbol}`,
                );
                expect(stateAfter.debtBalance).to.be.lt(stateBefore.debtBalance);
                expect(stateAfter.ratio).to.be.gt(0);
                await verifyTrackerAndSubState(proxy.address, true);
                return stateAfter;
            };

            let state = await logPositionState('BEFORE ANY EXECUTION');
            // nothing tracked before the first execution, sub is enabled
            await verifyTrackerAndSubState(nullAddress, true);

            state = await executePartialClose(
                'EXECUTION 1 - PARTIAL CLOSE (~50% OF DEBT)',
                debtAmountInUSD / 2,
                state,
            );

            // TODO: also verify the trigger price bypass directly (isTriggered returning true
            // even when the price condition is no longer met). Needs oracle price
            // mocking/manipulation between executions - currently the price condition stays
            // true for the whole test so the tracker bypass is only implicitly exercised

            await executePartialClose(
                'EXECUTION 2 - PARTIAL CLOSE (~25% OF DEBT)',
                debtAmountInUSD / 4,
                state,
            );

            // final execution - no extra actionsCallData element -> default behaviour:
            // fully closes the position, deactivates the sub and clears the tracker
            console.log('>>>>>> EXECUTION 3 - FULL CLOSE');
            await callCloseStrategy(null);
            const finalState = await logPositionState('AFTER 3rd (FINAL) EXECUTION');
            // ratio should be 0 at the end because position is closed
            expect(finalState.ratio).to.be.eq(0);
            await verifyTrackerAndSubState(nullAddress, false);
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
    runSemiContinuousCloseTests,
};
