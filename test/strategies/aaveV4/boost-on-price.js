const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const automationSdk = require('@defisaver/automation-sdk');

const {
    getProxy,
    network,
    takeSnapshot,
    revertToSnapshot,
    getAndSetMockExchangeWrapper,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    isNetworkFork,
    addBalancerFlLiquidity,
    nullAddress,
    redeploy,
    balanceOf,
    chainIds,
    getOwnerAddr,
} = require('../../utils/utils');

const { addBotCaller } = require('../utils/utils-strategies');

const {
    redeployAaveV4Contracts,
    deployAaveV4BoostOnPriceBundle,
    AAVE_V4_AUTOMATION_TEST_PAIRS,
    openAaveV4ProxyPosition,
    getSafetyRatio,
} = require('../../utils/aaveV4');

const { topUp } = require('../../../scripts/utils/fork');
const { subAaveV4LeverageManagementOnPrice } = require('../utils/strategy-subs');
const {
    callAaveV4FLBoostOnPriceStrategy,
    callAaveV4BoostOnPriceStrategy,
} = require('../utils/strategy-calls');

const runBoostOnPriceTests = () => {
    describe('AaveV4 Boost On Price Strategies Tests', () => {
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let mockWrapper;
        let flAddr;
        let bundleId;

        before(async () => {
            const isFork = isNetworkFork();

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
                await topUp(botAcc.address);
            }

            proxy = await getProxy(senderAcc.address);

            await redeploy('RecipeExecutor', isFork);
            strategyExecutor = (await redeploy('StrategyExecutor', isFork)).connect(botAcc);
            flAddr = (await redeploy('FLAction', isFork)).address;
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc, nullAddress, isFork);

            await redeployAaveV4Contracts();
            await addBotCaller(botAcc.address, isFork);
            bundleId = await deployAaveV4BoostOnPriceBundle();
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        const baseTest = async (pair, isFLStrategy) => {
            const collAmountInUSD = '1000';
            const debtAmountInUSD = '300';
            const boostAmountInUSD = '100';
            const targetRatioBoost = 115;
            const triggerPrice = '0'; // Should trigger if price > 0

            const collAsset = getAssetInfo(pair.collSymbol, chainIds[network]);
            const debtAsset = getAssetInfo(pair.debtSymbol, chainIds[network]);

            await openAaveV4ProxyPosition(
                proxy,
                senderAcc.address,
                pair.collReserveId,
                pair.debtReserveId,
                collAmountInUSD,
                debtAmountInUSD,
                pair.spoke,
            );

            const ratioBefore = await getSafetyRatio(pair.spoke, proxy.address);
            console.log('ratioBefore', ratioBefore);

            const { subId, strategySub } = await subAaveV4LeverageManagementOnPrice(
                bundleId,
                proxy,
                proxy.address,
                pair.spoke,
                collAsset.address,
                pair.collReserveId,
                debtAsset.address,
                pair.debtReserveId,
                targetRatioBoost,
                triggerPrice,
                automationSdk.enums.RatioState.OVER,
            );

            console.log('subId', subId);
            console.log('strategySub', strategySub);

            const boostAmount = await fetchAmountInUSDPrice(debtAsset.symbol, boostAmountInUSD);
            console.log('boostAmount', boostAmount);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                debtAsset,
                collAsset,
                boostAmount,
                mockWrapper,
            );

            console.log('exchangeObject', exchangeObject);

            const proxyCollBalanceBefore = await balanceOf(collAsset.address, proxy.address);
            const proxyDebtBalanceBefore = await balanceOf(debtAsset.address, proxy.address);

            if (isFLStrategy) {
                console.log('Adding balancer liquidity');
                await addBalancerFlLiquidity(debtAsset.address);
                await addBalancerFlLiquidity(collAsset.address);
                console.log('Calling AaveV4 FL Boost On Price strategy');
                await callAaveV4FLBoostOnPriceStrategy(
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    flAddr,
                    debtAsset.address,
                );
            } else {
                console.log('Calling AaveV4 Boost On Price strategy');
                await callAaveV4BoostOnPriceStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                );
            }

            const proxyCollBalanceAfter = await balanceOf(collAsset.address, proxy.address);
            const proxyDebtBalanceAfter = await balanceOf(debtAsset.address, proxy.address);

            expect(proxyCollBalanceAfter).to.be.eq(proxyCollBalanceBefore);
            expect(proxyDebtBalanceAfter).to.be.eq(proxyDebtBalanceBefore);

            const ratioAfter = await getSafetyRatio(pair.spoke, proxy.address);
            console.log('ratioAfter', ratioAfter);
            expect(ratioAfter).to.be.lt(ratioBefore);
        };

        for (let i = 0; i < AAVE_V4_AUTOMATION_TEST_PAIRS.length; ++i) {
            const pair = AAVE_V4_AUTOMATION_TEST_PAIRS[i];
            it(`... should execute aaveV4 SW boost on price strategy for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on ${pair.spokeName} spoke`, async () => {
                const isFLStrategy = false;
                await baseTest(pair, isFLStrategy);
            });
            it(`... should execute aaveV4 SW FL boost on price strategy for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on ${pair.spokeName} spoke`, async () => {
                const isFLStrategy = true;
                await baseTest(pair, isFLStrategy);
            });
        }
    }).timeout(1400000);
};

module.exports = {
    runBoostOnPriceTests,
};
