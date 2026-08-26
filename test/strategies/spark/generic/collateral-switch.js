const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');

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
const { subSparkGenericFLCollateralSwitchStrategy } = require('../../utils/strategy-subs');
const { callSparkGenericFLCollateralSwitchStrategy } = require('../../utils/strategy-calls');
const {
    SPARK_COLL_SWITCH_TEST_PAIRS,
    openSparkProxyPosition,
    openSparkEOAPosition,
    setupSparkEOAPermissions,
    getSparkReserveDataFromPool,
    deploySparkGenericFLCollateralSwitchStrategy,
    mockSparkOracle,
} = require('../../../utils/spark');

const runSparkCollSwitchTests = () => {
    describe('Spark Generic Collateral Switch Strategies Tests', function () {
        this.timeout(600000);
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let mockWrapper;
        let flAddr;
        let sparkView;
        let strategyId;

        before(async () => {
            const isFork = isNetworkFork();
            await hre.network.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

            await mockSparkOracle();

            senderAcc = (await hre.ethers.getSigners())[0];
            await sendEther(senderAcc, addrs[network].OWNER_ACC, '10');
            botAcc = (await hre.ethers.getSigners())[1];
            proxy = await getProxy(senderAcc.address);
            await addBotCaller(botAcc.address, isFork);
            strategyExecutor = (await getStrategyExecutorContract()).connect(botAcc);
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);
            sparkView = await redeploy('SparkView', isFork);
            const flContract = await getContractFromRegistry('FLAction', isFork);
            flAddr = flContract.address;

            await redeploy('SparkSupply', isFork);
            await redeploy('SparkWithdraw', isFork);
            await redeploy('PullToken', isFork);

            strategyId = await deploySparkGenericFLCollateralSwitchStrategy();
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        const baseTest = async (pair, isEOA) => {
            const positionOwner = isEOA ? senderAcc.address : proxy.address;

            if (isEOA) {
                await openSparkEOAPosition(
                    senderAcc.address,
                    proxy,
                    pair.fromAsset,
                    pair.toAsset,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.marketAddr,
                );
            } else {
                await openSparkProxyPosition(
                    senderAcc.address,
                    proxy,
                    pair.fromAsset,
                    pair.toAsset,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.marketAddr,
                );
            }

            const fromAsset = getAssetInfo(pair.fromAsset, chainIds[network]);
            const toAsset = getAssetInfo(pair.toAsset, chainIds[network]);

            if (isEOA) {
                await setupSparkEOAPermissions(
                    senderAcc.address,
                    proxy.address,
                    fromAsset.address,
                    toAsset.address,
                    pair.marketAddr,
                );
            }

            const fromAssetId = (
                await getSparkReserveDataFromPool(fromAsset.address, pair.marketAddr)
            ).id;
            const toAssetId = (await getSparkReserveDataFromPool(toAsset.address, pair.marketAddr))
                .id;
            const fromReserveData = await getSparkReserveDataFromPool(
                fromAsset.address,
                pair.marketAddr,
            );

            const isFullAmountSwitch = pair.amountToSwitchInUSD === hre.ethers.constants.MaxUint256;

            const amountToSwitch = isFullAmountSwitch
                ? hre.ethers.constants.MaxUint256
                : await fetchAmountInUSDPrice(fromAsset.symbol, pair.amountToSwitchInUSD);

            const { subId, strategySub } = await subSparkGenericFLCollateralSwitchStrategy(
                proxy,
                strategyId,
                fromAsset.address,
                fromAssetId,
                toAsset.address,
                toAssetId,
                pair.marketAddr,
                amountToSwitch,
                positionOwner,
                fromAsset.address,
                toAsset.address,
                pair.price,
                pair.priceState,
            );

            let exchangeAmount;
            if (isFullAmountSwitch) {
                exchangeAmount = await fetchAmountInUSDPrice(
                    fromAsset.symbol,
                    pair.collAmountInUSD * 0.99,
                );
            } else {
                exchangeAmount = await fetchAmountInUSDPrice(
                    fromAsset.symbol,
                    pair.amountToSwitchInUSD,
                );
            }

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                fromAsset,
                toAsset,
                exchangeAmount,
                mockWrapper,
            );

            await addBalancerFlLiquidity(fromAsset.address);
            await addBalancerFlLiquidity(toAsset.address);

            const dataBefore = await sparkView.getTokenBalances(pair.marketAddr, positionOwner, [
                fromAsset.address,
                toAsset.address,
            ]);
            expect(dataBefore[0].enabledAsCollateral).to.be.true;
            expect(dataBefore[1].enabledAsCollateral).to.be.false;

            await callSparkGenericFLCollateralSwitchStrategy(
                strategyExecutor,
                0,
                subId,
                strategySub,
                exchangeObject,
                exchangeAmount,
                flAddr,
                fromAsset.address,
                fromReserveData.aTokenAddress,
            );

            const dataAfter = await sparkView.getTokenBalances(pair.marketAddr, positionOwner, [
                fromAsset.address,
                toAsset.address,
            ]);

            const proxyFromAssetBalanceAfter = await balanceOf(fromAsset.address, proxy.address);
            const proxyToAssetBalanceAfter = await balanceOf(toAsset.address, proxy.address);
            expect(proxyFromAssetBalanceAfter).to.be.eq(0);
            expect(proxyToAssetBalanceAfter).to.be.eq(0);

            if (isFullAmountSwitch) {
                expect(dataAfter[0].enabledAsCollateral).to.be.false;
                expect(dataAfter[1].enabledAsCollateral).to.be.true;
                expect(dataAfter[0].balance).to.be.eq(0);
            } else {
                expect(dataAfter[0].enabledAsCollateral).to.be.true;
                expect(dataAfter[1].enabledAsCollateral).to.be.true;
            }
        };

        for (let i = 0; i < SPARK_COLL_SWITCH_TEST_PAIRS.length; ++i) {
            const pair = SPARK_COLL_SWITCH_TEST_PAIRS[i];
            it(`... should execute Spark generic SW fl collateral switch from ${pair.fromAsset} to ${pair.toAsset}`, async () => {
                await baseTest(pair, false);
            });
            it(`... should execute Spark generic EOA fl collateral switch from ${pair.fromAsset} to ${pair.toAsset}`, async () => {
                await baseTest(pair, true);
            });
        }
    });
};

module.exports = {
    runSparkCollSwitchTests,
};
