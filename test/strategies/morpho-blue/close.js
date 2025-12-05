// Morpho Blue Close strategies
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
    isCloseToDebtType,
    balanceOf,
} = require('../../utils/utils');

const { addBotCaller } = require('../utils/utils-strategies');
const { subMorphoBlueClose } = require('../utils/strategy-subs');
const {
    callMorphoBlueFLCloseToCollStrategy,
    callMorphoBlueFLCloseToDebtStrategy,
} = require('../utils/strategy-calls');
const { getCloseStrategyTypeName, getCloseStrategyConfigs } = require('../../utils/utils');
const {
    deployMorphoBlueCloseBundle,
    openMorphoBlueProxyPosition,
    collateralSupplyAmountInUsd,
    borrowAmountInUsd,
    getMorphoBluePositionRatio,
    MORPHO_BLUE_AUTOMATION_TEST_PAIRS,
    getMorphoBlueUserInfo,
} = require('../../utils/morpho-blue');

const runCloseTests = () => {
    describe('Morpho Blue Close Strategies Tests', () => {
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
            await redeploy('MorphoBluePriceRangeTrigger', isFork);

            bundleId = await deployMorphoBlueCloseBundle();
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        const baseTest = async (
            marketParams,
            collAsset,
            loanAsset,
            stopLossPrice,
            stopLossType,
            takeProfitPrice,
            takeProfitType,
        ) => {
            // Open morpho blue proxy position
            await openMorphoBlueProxyPosition(
                proxy,
                senderAcc.address,
                marketParams,
                collAsset.symbol,
                collateralSupplyAmountInUsd,
                loanAsset.symbol,
                borrowAmountInUsd,
            );

            // Log ratio before
            const ratioBefore = await getMorphoBluePositionRatio(marketParams, proxy.address);
            console.log('ratioBefore', ratioBefore);

            // Determine close strategy type based on parameters
            const closeStrategyType = automationSdk.utils.getCloseStrategyType(
                stopLossPrice,
                stopLossType,
                takeProfitPrice,
                takeProfitType,
            );

            // Subscribe to close strategy
            const result = await subMorphoBlueClose(
                proxy,
                proxy.address,
                marketParams.loanToken,
                marketParams.collateralToken,
                marketParams.oracle,
                marketParams.irm,
                marketParams.lltv,
                stopLossPrice,
                stopLossType,
                takeProfitPrice,
                takeProfitType,
                bundleId,
            );

            const closeSubId = result.subId;
            const strategySub = result.strategySub;

            // Add liquidity to balancer flash loan
            await addBalancerFlLiquidity(loanAsset.address);
            await addBalancerFlLiquidity(collAsset.address);

            const userInfo = await getMorphoBlueUserInfo(marketParams, proxy.address);

            if (isCloseToDebtType(automationSdk, closeStrategyType)) {
                // Close to debt: flash loan debt asset, sell collateral to repay
                const sellAmount = await fetchAmountInUSDPrice(
                    collAsset.symbol,
                    collateralSupplyAmountInUsd,
                );
                const exchangeObject = await formatMockExchangeObjUsdFeed(
                    collAsset,
                    loanAsset,
                    sellAmount,
                    mockWrapper,
                );
                const flAmount = (await fetchAmountInUSDPrice(loanAsset.symbol, borrowAmountInUsd))
                    .mul(hre.ethers.BigNumber.from(100))
                    .div(hre.ethers.BigNumber.from(99));

                await callMorphoBlueFLCloseToDebtStrategy(
                    strategyExecutor,
                    0,
                    closeSubId,
                    strategySub,
                    exchangeObject,
                    loanAsset.address,
                    flAmount,
                    flAddr,
                    userInfo.collateral,
                );
            } else {
                // Close to collateral: flash loan collateral asset, sell to get debt asset
                const flAmount = (await fetchAmountInUSDPrice(collAsset.symbol, borrowAmountInUsd))
                    .mul(hre.ethers.BigNumber.from(100))
                    .div(hre.ethers.BigNumber.from(99));
                const exchangeObject = await formatMockExchangeObjUsdFeed(
                    collAsset,
                    loanAsset,
                    flAmount,
                    mockWrapper,
                );

                await callMorphoBlueFLCloseToCollStrategy(
                    strategyExecutor,
                    1,
                    closeSubId,
                    strategySub,
                    exchangeObject,
                    collAsset.address,
                    flAmount,
                    flAddr,
                    userInfo.collateral,
                );
            }

            const ratioAfter = await getMorphoBluePositionRatio(marketParams, proxy.address);
            console.log('ratioAfter', ratioAfter);
            console.log('ratioBefore', ratioBefore);
            // ratio should be 0 at the end because position is closed
            expect(ratioAfter).to.be.eq(0);

            // make sure no dust left on wallet
            const walletCollBalance = await balanceOf(marketParams.collateralToken, proxy.address);
            const walletLoanBalance = await balanceOf(marketParams.loanToken, proxy.address);
            expect(walletCollBalance).to.be.eq(0);
            expect(walletLoanBalance).to.be.eq(0);
        };

        const testPairs = MORPHO_BLUE_AUTOMATION_TEST_PAIRS[chainIds[network]] || [];
        const closeStrategyConfigs = getCloseStrategyConfigs(automationSdk);

        for (let i = 0; i < testPairs.length; ++i) {
            const pair = testPairs[i];
            const collAsset = getAssetInfo(pair.collSymbol, chainIds[network]);
            const loanAsset = getAssetInfo(pair.loanSymbol, chainIds[network]);

            for (let j = 0; j < closeStrategyConfigs.length; ++j) {
                const config = closeStrategyConfigs[j];
                const strategyTypeName = automationSdk.utils.getCloseStrategyType(
                    config.stopLossPrice,
                    config.stopLossType,
                    config.takeProfitPrice,
                    config.takeProfitType,
                );

                it(`... should execute Morpho Blue SW Close (${getCloseStrategyTypeName(
                    strategyTypeName,
                )}) for ${pair.collSymbol} / ${pair.debtSymbol}`, async () => {
                    console.log(`Testing SW Close strategy type: ${strategyTypeName}`);
                    await baseTest(
                        pair.marketParams,
                        collAsset,
                        loanAsset,
                        config.stopLossPrice,
                        config.stopLossType,
                        config.takeProfitPrice,
                        config.takeProfitType,
                    );
                });
            }
        }
    });
};

describe('Morpho Blue close strategies test', function () {
    this.timeout(80000);

    it('... test Morpho Blue close strategies', async () => {
        await runCloseTests();
    }).timeout(50000);
});

module.exports = {
    runCloseTests,
};
