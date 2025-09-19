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
    getCloseStrategyTypeName,
    getAaveV3CloseStrategyConfigs,
} = require('../../../utils/aave');

const runCloseTests = () => {
    describe('AaveV3 Close to debt Strategies take', () => {
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

            // Determine if we're closing to debt or collateral based on strategy type
            const closeToDebt =
                closeStrategyType === automationSdk.enums.CloseStrategyType.TAKE_PROFIT_IN_DEBT ||
                closeStrategyType === automationSdk.enums.CloseStrategyType.STOP_LOSS_IN_DEBT ||
                closeStrategyType ===
                    automationSdk.enums.CloseStrategyType.TAKE_PROFIT_AND_STOP_LOSS_IN_DEBT ||
                closeStrategyType ===
                    automationSdk.enums.CloseStrategyType
                        .TAKE_PROFIT_IN_DEBT_AND_STOP_LOSS_IN_COLLATERAL;

            // Execute strategy (always with flash loan)
            console.log(
                'Executing FL Close strategy with type:',
                closeStrategyType,
                'closeToDebt:',
                closeToDebt,
            );
            await addBalancerFlLiquidity(debtAsset.address);
            await addBalancerFlLiquidity(collAsset.address);

            if (closeToDebt) {
                // Close to debt: flash loan debt asset, sell collateral to repay
                const sellAmount = await fetchAmountInUSDPrice(collAsset.symbol, collAmountInUSD);
                const exchangeObject = await formatMockExchangeObjUsdFeed(
                    collAsset,
                    debtAsset,
                    sellAmount,
                    mockWrapper,
                );
                const flAmount = (await fetchAmountInUSDPrice(debtAsset.symbol, debtAmountInUSD))
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
                );
            } else {
                // Close to collateral: flash loan collateral asset, sell to get debt asset
                const flAmount = (await fetchAmountInUSDPrice(collAsset.symbol, debtAmountInUSD))
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
                );
            }

            const ratioAfter = await getAaveV3PositionRatio(positionOwner, null, marketAddress);
            console.log('ratioAfter', ratioAfter);
            console.log('ratioBefore', ratioBefore);
            // ratio should be 0 at the end because position is closed
            expect(ratioAfter).to.be.eq(0);
        };

        const testPairs = AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY[chainIds[network]] || [];
        const closeStrategyConfigs = getAaveV3CloseStrategyConfigs(automationSdk);

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
    runCloseTests,
};
