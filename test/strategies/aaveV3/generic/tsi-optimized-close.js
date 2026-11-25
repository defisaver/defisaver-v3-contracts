// AaveV3 TsiOptimized Close strategies
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

const { subAaveV3TsiOptimizedCloseGeneric } = require('../../utils/strategy-subs');
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

// TsiOptimized close uses the same strategies and bundle as the generic close (and partial execution).
// The only difference is that the sub has 2 extra metadata slots at the end of subData:
// [..., tsi, slippage]. Strategies don't reference them in their param mapping, so on chain
// they are ignored and only the backend reads them.
const TSI = '50000000000000000'; // 0.05 in 1e18
const SLIPPAGE = '20000000000000000'; // 0.02 in 1e18

const runTsiOptimizedCloseTests = () => {
    describe('AaveV3 TsiOptimized Close Strategies', () => {
        const strategyExecutorName =
            network === 'mainnet' ? 'StrategyExecutor' : 'StrategyExecutorL2';

        let env;
        let strategyExecutor;
        let partialExecutionStorage;
        let subStorage;

        before(async () => {
            env = await setupGenericTestEnv({
                extraRedeploys: [
                    // StrategyExecutor approves the start of partial execution in the partial execution
                    // storage and RecipeExecutor requires it. The one in env is the live one, so use the new one
                    strategyExecutorName,
                    // RecipeExecutor with partial execution support + the partial execution storage it reads
                    // from registry
                    'RecipeExecutor',
                    'StrategyPartialExecutionStorage',
                    'AaveV3QuotePriceTrigger',
                    'AaveV3QuotePriceRangeTrigger',
                    'SendTokenAndUnwrap',
                    'SendTokensAndUnwrap',
                ],
                deployBundleFn: deployAaveV3CloseGenericBundle,
            });
            strategyExecutor = env.contracts[strategyExecutorName].connect(env.botAcc);
            partialExecutionStorage = env.contracts.StrategyPartialExecutionStorage;
            subStorage = await hre.ethers.getContractAt(
                'SubStorage',
                await getAddrFromRegistry('SubStorage'),
            );
        });

        useSnapshots();

        // withPartialExecutions: close in 3 txs (2 partial executions + final one), otherwise in 1 tx
        const baseTest = async ({
            collAsset,
            debtAsset,
            pair,
            config,
            isEOA,
            withPartialExecutions,
        }) => {
            const { senderAcc, proxy, mockWrapper, flAddr, bundleId } = env;
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

            const { subId, strategySub } = await subAaveV3TsiOptimizedCloseGeneric(
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
                TSI,
                SLIPPAGE,
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

            const verifyPartialExecutionStorageAndSubState = async (
                expectedWallet,
                expectedIsEnabled,
            ) => {
                const partialExecutionWallet =
                    await partialExecutionStorage.getPartialExecutionWallet(subId);
                const storedSub = await subStorage.getSub(subId);
                console.log(
                    `EXECUTION WALLET IN PARTIAL EXECUTION STORAGE FOR SUB ${subId}: ${partialExecutionWallet}`,
                );
                console.log(`SUB ENABLED: ${storedSub.isEnabled}`);
                expect(partialExecutionWallet.toLowerCase()).to.be.eq(expectedWallet.toLowerCase());
                expect(storedSub.isEnabled).to.be.eq(expectedIsEnabled);
            };

            // Executes one strategy run (always with flash loan). When partialCloseUsdAmount
            // is set it's a partial execution: only that USD amount of debt is
            // repaid and the extra actionsCallData element tells RecipeExecutor to keep the
            // sub active and store the executing wallet
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
            // and the partial execution storage must remember the executing wallet
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
                await verifyPartialExecutionStorageAndSubState(proxy.address, true);
                return stateAfter;
            };

            let state = await logPositionState('BEFORE ANY EXECUTION');
            // nothing stored before the first execution, sub is enabled
            await verifyPartialExecutionStorageAndSubState(nullAddress, true);

            if (withPartialExecutions) {
                state = await executePartialClose(
                    'EXECUTION 1 - PARTIAL CLOSE (~50% OF DEBT)',
                    debtAmountInUSD / 2,
                    state,
                );

                await executePartialClose(
                    'EXECUTION 2 - PARTIAL CLOSE (~25% OF DEBT)',
                    debtAmountInUSD / 4,
                    state,
                );
            }

            // final execution - no extra actionsCallData element -> default behaviour:
            // fully closes the position, deactivates the sub and clears the partial execution storage
            console.log('>>>>>> FINAL EXECUTION - FULL CLOSE');
            await callCloseStrategy(null);
            const finalState = await logPositionState('AFTER FINAL EXECUTION');
            // ratio should be 0 at the end because position is closed
            expect(finalState.ratio).to.be.eq(0);
            await verifyPartialExecutionStorageAndSubState(nullAddress, false);
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
                    [
                        { withPartialExecutions: false, txsDescription: 'in 1 tx' },
                        { withPartialExecutions: true, txsDescription: 'in 3 txs' },
                    ].forEach(({ withPartialExecutions, txsDescription }) => {
                        it(`... should execute aaveV3 ${label} TsiOptimized Close (${getCloseStrategyTypeName(
                            strategyTypeName,
                        )}) ${txsDescription} for ${pair.collSymbol} / ${pair.debtSymbol} pair on Aave V3 ${marketName}`, async () => {
                            console.log(
                                `Testing ${label} TsiOptimized Close strategy type: ${strategyTypeName}`,
                            );
                            await baseTest({
                                collAsset,
                                debtAsset,
                                pair,
                                config,
                                isEOA,
                                withPartialExecutions,
                            });
                        });
                    });
                });
            });
        });
    });
};

module.exports = {
    runTsiOptimizedCloseTests,
};
