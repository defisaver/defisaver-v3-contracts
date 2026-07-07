// AaveV3 Close strategies
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
    getCloseStrategyTypeName,
    getCloseStrategyConfigs,
    isCloseToDebtType,
    getAddrFromRegistry,
    balanceOf,
    nullAddress,
} = require('../../../utils/utils');

const { addBotCaller } = require('../../utils/utils-strategies');
const { subAaveV3CloseGeneric } = require('../../utils/strategy-subs');
const {
    callAaveV3GenericFLCloseToCollStrategy,
    callAaveV3GenericFLCloseToDebtStrategy,
} = require('../../utils/strategy-calls');
const {
    AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY,
    openAaveV3ProxyPosition,
    openAaveV3EOAPosition,
    getAaveV3PositionRatio,
    deployAaveV3CloseGenericBundle,
    setupAaveV3EOAPermissions,
    getAaveV3ReserveData,
} = require('../../../utils/aave');

const runSemiContinuousCloseTests = () => {
    describe('AaveV3 Semi-Continuous Close Strategies', () => {
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let mockWrapper;
        let flAddr;
        let bundleId;
        let semiContinuousTracker;
        let subStorage;

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

            subStorage = await hre.ethers.getContractAt(
                'SubStorage',
                await getAddrFromRegistry('SubStorage'),
            );

            // Redeploys
            // RecipeExecutor with semi-continuous support + the tracker it reads from registry
            await redeploy('RecipeExecutor', isFork);
            semiContinuousTracker = await redeploy('SemiContinuousTracker', isFork);
            await redeploy('AaveV3QuotePriceTrigger', isFork);
            await redeploy('AaveV3QuotePriceRangeTrigger', isFork);
            await redeploy('AaveV3Borrow', isFork);
            await redeploy('AaveV3Payback', isFork);
            await redeploy('AaveV3Supply', isFork);
            await redeploy('AaveV3Withdraw', isFork);
            await redeploy('AaveV3RatioCheck', isFork);
            await redeploy('AaveV3OpenRatioCheck', isFork);
            await redeploy('AaveV3View', isFork);
            await redeploy('SubProxy', isFork);
            await redeploy('SendTokenAndUnwrap', isFork);
            await redeploy('SendTokensAndUnwrap', isFork);

            bundleId = await deployAaveV3CloseGenericBundle();
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
            isEOA,
            stopLossPrice,
            stopLossType,
            takeProfitPrice,
            takeProfitType,
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

            // Get reserve data (asset ids + aToken/variableDebtToken addrs for position tracking)
            const collReserveData = await getAaveV3ReserveData(collAsset.address, marketAddress);
            const debtReserveData = await getAaveV3ReserveData(debtAsset.address, marketAddress);
            const collAssetId = collReserveData.id;
            const debtAssetId = debtReserveData.id;

            const user = isEOA ? senderAcc.address : proxy.address;

            console.log('STOP LOSS PRICE', stopLossPrice);
            console.log('STOP LOSS TYPE', stopLossType);
            console.log('TAKE PROFIT PRICE', takeProfitPrice);
            console.log('TAKE PROFIT TYPE', takeProfitType);
            // Determine close strategy type based on parameters
            const closeStrategyType = automationSdk.utils.getCloseStrategyType(
                stopLossPrice,
                stopLossType,
                takeProfitPrice,
                takeProfitType,
            );

            // Create subscription based on whether it's EOA or proxy
            const result = await subAaveV3CloseGeneric(
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

            console.log('SUBBED !!!!');
            // console.log(repaySubId, strategySub);

            const closeToDebt = isCloseToDebtType(automationSdk, closeStrategyType);

            console.log(
                'Executing FL Close strategy with type:',
                closeStrategyType,
                'closeToDebt:',
                closeToDebt,
            );
            await addBalancerFlLiquidity(debtAsset.address);
            await addBalancerFlLiquidity(collAsset.address);

            const logPositionState = async (label) => {
                const collBalance = await balanceOf(collReserveData.aTokenAddress, positionOwner);
                const debtBalance = await balanceOf(
                    debtReserveData.variableDebtTokenAddress,
                    positionOwner,
                );
                const ratio = await getAaveV3PositionRatio(positionOwner, null, marketAddress);
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
                const storedWallet = await semiContinuousTracker.getWalletForSub(repaySubId);
                const storedSub = await subStorage.getSub(repaySubId);
                console.log(`TRACKER WALLET FOR SUB ${repaySubId}: ${storedWallet}`);
                console.log(`SUB ENABLED: ${storedSub.isEnabled}`);
                expect(storedWallet.toLowerCase()).to.be.eq(expectedWallet.toLowerCase());
                expect(storedSub.isEnabled).to.be.eq(expectedIsEnabled);
            };

            // Executes one strategy run (always with flash loan). When partialCloseUsdAmount
            // is set it's a semi-continuous partial execution: only that USD amount of debt is
            // repaid and the extra actionsCallData element tells RecipeExecutor to keep the
            // sub active and track the executing wallet
            const callCloseStrategy = async (partialCloseUsdAmount) => {
                const isPartial = !!partialCloseUsdAmount;
                const semiContinuousOptions = {
                    partialClose: isPartial
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
                        : null,
                };

                if (closeToDebt) {
                    // Close to debt: flash loan debt asset, sell collateral to repay
                    const sellAmount = isPartial
                        ? semiContinuousOptions.partialClose.pullAmount
                        : await fetchAmountInUSDPrice(collAsset.symbol, collAmountInUSD);
                    const exchangeObject = await formatMockExchangeObjUsdFeed(
                        collAsset,
                        debtAsset,
                        sellAmount,
                        mockWrapper,
                    );
                    const flAmount = (
                        await fetchAmountInUSDPrice(
                            debtAsset.symbol,
                            isPartial ? partialCloseUsdAmount : debtAmountInUSD,
                        )
                    )
                        .mul(hre.ethers.BigNumber.from(100))
                        .div(hre.ethers.BigNumber.from(99));

                    await callAaveV3GenericFLCloseToDebtStrategy(
                        strategyExecutor,
                        0,
                        repaySubId,
                        strategySub,
                        exchangeObject,
                        flAmount,
                        flAddr,
                        marketAddress,
                        semiContinuousOptions,
                    );
                } else {
                    // Close to collateral: flash loan collateral asset, sell to get debt asset
                    const flAmount = (
                        await fetchAmountInUSDPrice(
                            collAsset.symbol,
                            isPartial ? partialCloseUsdAmount : debtAmountInUSD,
                        )
                    )
                        .mul(hre.ethers.BigNumber.from(100))
                        .div(hre.ethers.BigNumber.from(99));
                    const exchangeObject = await formatMockExchangeObjUsdFeed(
                        collAsset,
                        debtAsset,
                        flAmount,
                        mockWrapper,
                    );

                    await callAaveV3GenericFLCloseToCollStrategy(
                        strategyExecutor,
                        1,
                        repaySubId,
                        strategySub,
                        exchangeObject,
                        flAmount,
                        flAddr,
                        marketAddress,
                        semiContinuousOptions,
                    );
                }
            };

            const stateBefore = await logPositionState('BEFORE ANY EXECUTION');
            // nothing tracked before the first execution, sub is enabled
            await verifyTrackerAndSubState(nullAddress, true);

            // 1st execution - partially closes ~50% of the debt, sub must stay active
            console.log('>>>>>> EXECUTION 1 - PARTIAL CLOSE (~50% OF DEBT)');
            await callCloseStrategy(debtAmountInUSD / 2);
            const stateAfterFirst = await logPositionState('AFTER 1st (PARTIAL) EXECUTION');
            console.log(
                `REPAID: ${hre.ethers.utils.formatUnits(
                    stateBefore.debtBalance.sub(stateAfterFirst.debtBalance),
                    debtAsset.decimals,
                )} ${debtAsset.symbol}`,
            );
            expect(stateAfterFirst.debtBalance).to.be.lt(stateBefore.debtBalance);
            expect(stateAfterFirst.ratio).to.be.gt(0);
            await verifyTrackerAndSubState(proxy.address, true);

            // TODO: also verify the trigger price bypass directly (isTriggered returning true
            // even when the price condition is no longer met). Needs oracle price
            // mocking/manipulation between executions - currently the price condition stays
            // true for the whole test so the tracker bypass is only implicitly exercised

            // 2nd execution - partially closes half of the remaining debt (~25% of start)
            console.log('>>>>>> EXECUTION 2 - PARTIAL CLOSE (~25% OF DEBT)');
            await callCloseStrategy(debtAmountInUSD / 4);
            const stateAfterSecond = await logPositionState('AFTER 2nd (PARTIAL) EXECUTION');
            console.log(
                `REPAID: ${hre.ethers.utils.formatUnits(
                    stateAfterFirst.debtBalance.sub(stateAfterSecond.debtBalance),
                    debtAsset.decimals,
                )} ${debtAsset.symbol}`,
            );
            expect(stateAfterSecond.debtBalance).to.be.lt(stateAfterFirst.debtBalance);
            expect(stateAfterSecond.ratio).to.be.gt(0);
            await verifyTrackerAndSubState(proxy.address, true);

            // 3rd execution - no extra actionsCallData element -> default behaviour:
            // fully closes the position, deactivates the sub and clears the tracker
            console.log('>>>>>> EXECUTION 3 - FULL CLOSE');
            await callCloseStrategy(null);
            const stateAfterThird = await logPositionState('AFTER 3rd (FINAL) EXECUTION');
            // ratio should be 0 at the end because position is closed
            expect(stateAfterThird.ratio).to.be.eq(0);
            await verifyTrackerAndSubState(nullAddress, false);
        };

        const testPairs = AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY[chainIds[network]] || [];
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

            // Determine market name for test description
            const marketName =
                pair.marketAddr === addrs[network].AAVE_MARKET ? 'Core Market' : 'Prime Market';

            for (let j = 0; j < closeStrategyConfigs.length; ++j) {
                const config = closeStrategyConfigs[j];
                const strategyTypeName = automationSdk.utils.getCloseStrategyType(
                    config.stopLossPrice,
                    config.stopLossType,
                    config.takeProfitPrice,
                    config.takeProfitType,
                );

                // SW Tests
                it(`... should execute aaveV3 SW Close (${getCloseStrategyTypeName(
                    strategyTypeName,
                )}) for ${pair.collSymbol} / ${
                    pair.debtSymbol
                } pair on Aave V3 ${marketName}`, async () => {
                    const isEOA = false;
                    console.log(`Testing SW Close strategy type: ${strategyTypeName}`);
                    await baseTest(
                        collAsset,
                        debtAsset,
                        pair.collAmountInUSD,
                        pair.debtAmountInUSD,
                        isEOA,
                        config.stopLossPrice,
                        config.stopLossType,
                        config.takeProfitPrice,
                        config.takeProfitType,
                        pair.marketAddr,
                    );
                });

                // EOA Tests
                it(`... should execute aaveV3 EOA Close (${getCloseStrategyTypeName(
                    strategyTypeName,
                )}) for ${pair.collSymbol} / ${
                    pair.debtSymbol
                } pair on Aave V3 ${marketName}`, async () => {
                    const isEOA = true;
                    console.log(`Testing EOA Close strategy type: ${strategyTypeName}`);
                    await baseTest(
                        collAsset,
                        debtAsset,
                        pair.collAmountInUSD,
                        pair.debtAmountInUSD,
                        isEOA,
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

module.exports = {
    runSemiContinuousCloseTests,
};
