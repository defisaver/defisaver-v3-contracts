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
    getStrategyExecutorContract,
    getAndSetMockExchangeWrapper,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    getContractFromRegistry,
    isNetworkFork,
    redeploy,
    sendEther,
    addBalancerFlLiquidity,
    balanceOf,
} = require('../../utils/utils');

const { addBotCaller } = require('../utils/utils-strategies');
const {
    SPARK_COLL_SWITCH_TEST_PAIRS,
    openSparkProxyPosition,
    getSparkReserveDataFromPool,
    deploySparkFLCollateralSwitchStrategy,
} = require('../../utils/spark');
const { subSparkFLCollateralSwitchStrategy } = require('../utils/strategy-subs');
const { callSparkFLCollateralSwitchStrategy } = require('../utils/strategy-calls');

const runSparkCollSwitchTests = () => {
    describe('Spark Coll Switch Strategies Tests', () => {
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
            strategyId = await deploySparkFLCollateralSwitchStrategy();
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        for (let i = 0; i < SPARK_COLL_SWITCH_TEST_PAIRS.length; ++i) {
            const pair = SPARK_COLL_SWITCH_TEST_PAIRS[i];
            it(`... should execute spark fl collateral switch from ${pair.fromAsset} to ${pair.toAsset}`, async () => {
                await openSparkProxyPosition(
                    senderAcc.address,
                    proxy,
                    pair.fromAsset,
                    pair.toAsset,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.marketAddr,
                );

                const fromAsset = getAssetInfo(pair.fromAsset, chainIds[network]);
                const toAsset = getAssetInfo(pair.toAsset, chainIds[network]);

                const fromAssetId = (
                    await getSparkReserveDataFromPool(fromAsset.address, pair.marketAddr)
                ).id;
                const toAssetId = (
                    await getSparkReserveDataFromPool(toAsset.address, pair.marketAddr)
                ).id;

                const isFullAmountSwitch =
                    pair.amountToSwitchInUSD === hre.ethers.constants.MaxUint256;

                const amountToSwitch = isFullAmountSwitch
                    ? hre.ethers.constants.MaxUint256
                    : await fetchAmountInUSDPrice(fromAsset.symbol, pair.amountToSwitchInUSD);

                const { subId, strategySub } = await subSparkFLCollateralSwitchStrategy(
                    proxy,
                    strategyId,
                    fromAsset.address,
                    fromAssetId,
                    toAsset.address,
                    toAssetId,
                    pair.marketAddr,
                    amountToSwitch,
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

                const dataBefore = await sparkView.getTokenBalances(
                    pair.marketAddr,
                    proxy.address,
                    [fromAsset.address, toAsset.address],
                );
                expect(dataBefore[0].enabledAsCollateral).to.be.true;
                expect(dataBefore[1].enabledAsCollateral).to.be.false;

                // -------------------- DEBUG: CHECK SUPPLY CAP
                // const dataProvider = await hre.ethers.getContractAt(
                //     ['function getReserveCaps(address asset) view returns (uint256 borrowCap, uint256 supplyCap)',
                //      'function getReserveData(address asset) view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)'],
                //     '0xFc21d6d146E6086B8359705C8b28512a983db0cb',
                // );
                // const caps = await dataProvider.getReserveCaps(toAsset.address);
                // const reserveData = await dataProvider.getReserveData(toAsset.address);
                // console.log(`${toAsset.symbol} supplyCap: ${caps.supplyCap.toString()}`);
                // console.log(`${toAsset.symbol} totalAToken: ${reserveData.totalAToken.toString()}`);
                // const capInWei = caps.supplyCap.mul(hre.ethers.BigNumber.from(10).pow(toAsset.decimals));
                // console.log(`Cap full: ${reserveData.totalAToken.gte(capInWei)}`);
                // ---------------------

                await callSparkFLCollateralSwitchStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    exchangeAmount,
                    flAddr,
                    fromAsset.address,
                );

                const dataAfter = await sparkView.getTokenBalances(pair.marketAddr, proxy.address, [
                    fromAsset.address,
                    toAsset.address,
                ]);

                const proxyFromAssetBalanceAfter = await balanceOf(
                    fromAsset.address,
                    proxy.address,
                );
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
            });
        }
    });
};

describe('Spark coll switch strategy test', function () {
    this.timeout(80000);
    it('... test Spark coll switch strategy', async () => {
        await runSparkCollSwitchTests();
    });
});

module.exports = {
    runSparkCollSwitchTests,
};
