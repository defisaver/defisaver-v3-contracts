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
} = require('../../utils/utils');

const { addBotCaller } = require('../utils/utils-strategies');

const {
    redeployAaveV4Contracts,
    deployAaveV4RepayBundle,
    AAVE_V4_AUTOMATION_TEST_PAIRS,
    openAaveV4ProxyPosition,
    getSafetyRatio,
} = require('../../utils/aaveV4');
const { getOwnerAddr, chainIds, balanceOf } = require('../../utils/utils');
const { topUp } = require('../../../scripts/utils/fork');
const { subAaveV4LeverageManagement } = require('../utils/strategy-subs');
const { callAaveV4FLRepayStrategy, callAaveV4RepayStrategy } = require('../utils/strategy-calls');

const runRepayTests = () => {
    describe('AaveV4 Repay Strategies Tests', () => {
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
            bundleId = await deployAaveV4RepayBundle();
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
            const repayAmountInUSD = '100';
            const targetRatioRepay = 390;
            const triggerRatioRepay = 400;

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

            const { subId, strategySub } = await subAaveV4LeverageManagement(
                bundleId,
                proxy,
                proxy.address,
                pair.spoke,
                automationSdk.enums.RatioState.UNDER,
                targetRatioRepay,
                triggerRatioRepay,
            );

            console.log('subId', subId);
            console.log('strategySub', strategySub);

            const repayAmount = await fetchAmountInUSDPrice(collAsset.symbol, repayAmountInUSD);
            console.log('repayAmount', repayAmount);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                collAsset,
                debtAsset,
                repayAmount,
                mockWrapper,
            );

            console.log('exchangeObject', exchangeObject);

            const proxyCollBalanceBefore = await balanceOf(collAsset.address, proxy.address);
            const proxyDebtBalanceBefore = await balanceOf(debtAsset.address, proxy.address);

            if (isFLStrategy) {
                console.log('Adding balancer liquidity');
                await addBalancerFlLiquidity(debtAsset.address);
                await addBalancerFlLiquidity(collAsset.address);
                console.log('Calling AaveV4 FL Repay strategy');
                await callAaveV4FLRepayStrategy(
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    pair.collReserveId,
                    pair.debtReserveId,
                    repayAmount,
                    flAddr,
                    collAsset.address,
                    debtAsset.address,
                );
            } else {
                console.log('Calling AaveV4 Repay strategy');
                await callAaveV4RepayStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    pair.collReserveId,
                    pair.debtReserveId,
                    repayAmount,
                    debtAsset.address,
                );
            }

            const proxyCollBalanceAfter = await balanceOf(collAsset.address, proxy.address);
            const proxyDebtBalanceAfter = await balanceOf(debtAsset.address, proxy.address);

            expect(proxyCollBalanceAfter).to.be.eq(proxyCollBalanceBefore);
            expect(proxyDebtBalanceAfter).to.be.eq(proxyDebtBalanceBefore);

            const ratioAfter = await getSafetyRatio(pair.spoke, proxy.address);
            console.log('ratioAfter', ratioAfter);
            expect(ratioAfter).to.be.gt(ratioBefore);
        };

        for (let i = 0; i < AAVE_V4_AUTOMATION_TEST_PAIRS.length; ++i) {
            const pair = AAVE_V4_AUTOMATION_TEST_PAIRS[i];
            it(`... should execute aaveV4 SW repay strategy for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on ${pair.spokeName} spoke`, async () => {
                const isFLStrategy = false;
                await baseTest(pair, isFLStrategy);
            });
            it(`... should execute aaveV4 SW FL repay strategy for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on ${pair.spokeName} spoke`, async () => {
                const isFLStrategy = true;
                await baseTest(pair, isFLStrategy);
            });
        }
    });
};

module.exports = {
    runRepayTests,
};
