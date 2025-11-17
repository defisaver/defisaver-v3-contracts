const hre = require('hardhat');
const { expect } = require('chai');

const { configure } = require('@defisaver/sdk');
const { assets } = require('@defisaver/tokens');

const {
    getProxy,
    redeployCore,
    setBalance,
    openStrategyAndBundleStorage,
    fetchAmountinUSDPrice,
    resetForkToBlock,
    network,
    addrs,
    chainIds,
    setNewExchangeWrapper,
    getContractFromRegistry,
    redeploy,
} = require('../../utils/utils');

const { addBotCaller, createStrategy, createBundle } = require('../utils/utils-strategies');

const {
    createSparkRepayStrategy,
    createSparkFLRepayStrategy,
    createSparkBoostStrategy,
    createSparkFLBoostStrategy,
} = require('../../../strategies-spec/mainnet');

const {
    subSparkAutomationStrategy,
    updateSparkAutomationStrategy,
} = require('../utils/strategy-subs');

const {
    callSparkRepayStrategy,
    callSparkFLRepayStrategy,
    callSparkBoostStrategy,
    callSparkFLBoostStrategy,
} = require('../utils/strategy-calls');

const { sparkSupply, sparkBorrow } = require('../../utils/actions');

const deployBundles = async (isFork = false) => {
    await openStrategyAndBundleStorage(isFork);
    const sparkRepayStrategyEncoded = createSparkRepayStrategy();
    const sparkRepayFLStrategyEncoded = createSparkFLRepayStrategy();

    const strategyId1 = await createStrategy(...sparkRepayStrategyEncoded, true);
    const strategyId2 = await createStrategy(...sparkRepayFLStrategyEncoded, true);

    const repayBundleId = await createBundle([strategyId1, strategyId2]);
    const sparkBoostStrategyEncoded = createSparkBoostStrategy();
    const sparkBoostFLStrategyEncoded = createSparkFLBoostStrategy();

    const strategyId11 = await createStrategy(...sparkBoostStrategyEncoded, true);
    const strategyId22 = await createStrategy(...sparkBoostFLStrategyEncoded, true);

    const boostBundleId = await createBundle([strategyId11, strategyId22]);

    await getContractFromRegistry('SparkSubProxy', isFork, repayBundleId, boostBundleId);
    return { repayBundleId, boostBundleId };
};

const testPairs = [
    {
        collAsset: 'WETH',
        debtAsset: 'DAI',
    },
    {
        collAsset: 'rETH',
        debtAsset: 'DAI',
    },
    {
        collAsset: 'DAI',
        debtAsset: 'WETH',
    },
];

const sparkRepayStrategyTest = async (numTestPairs) => {
    describe('Spark-Repay-Strategy-Test', function () {
        this.timeout(1200000);

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let pool;
        let sparkView;
        let subIds;
        let collAssetId;
        let debtAssetId;
        let flAddr;

        before(async () => {
            console.log(`Network: ${network}`);

            await resetForkToBlock();

            configure({
                chainId: chainIds[network],
                testMode: true,
            });

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            proxyAddr = proxy.address;

            console.log('proxyAddr: ', proxyAddr);

            const sparkMarketContract = await hre.ethers.getContractAt(
                'IPoolAddressesProvider',
                addrs[network].SPARK_MARKET,
            );
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore();

            await redeploy('SparkSupply');
            await redeploy('SparkBorrow');
            await redeploy('BotAuth');
            await redeploy('SparkRatioTrigger');
            await redeploy('GasFeeTaker');
            await redeploy('DFSSell');
            await redeploy('SparkPayback');
            await redeploy('SparkWithdraw');
            await redeploy('SparkRatioCheck');

            ({ address: flAddr } = await redeploy('FLAction'));

            sparkView = await getContractFromRegistry('SparkView');

            await setNewExchangeWrapper(senderAcc, addrs[network].UNISWAP_V3_WRAPPER);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);
            await deployBundles();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should make a Spark Repay bundle and subscribe', async () => {
                const amount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, '20000'),
                    collAssetInfo.decimals,
                );
                await setBalance(collAddr, senderAcc.address, amount);

                const reserveData = await pool.getReserveData(collAddr);
                collAssetId = reserveData.id;

                await sparkSupply(
                    proxy,
                    addrs[network].SPARK_MARKET,
                    amount,
                    collAddr,
                    collAssetId,
                    senderAcc.address,
                );

                const reserveDataDebt = await pool.getReserveData(debtAddr);

                const amountDebt = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].debtAsset, '10000'),
                    debtAssetInfo.decimals,
                );

                debtAssetId = reserveDataDebt.id;
                await sparkBorrow(
                    proxy,
                    addrs[network].SPARK_MARKET,
                    amountDebt,
                    senderAcc.address,
                    2,
                    debtAssetId,
                );

                const targetRatio = 230;
                const ratioUnder = 220;

                // same as in L2
                subIds = await subSparkAutomationStrategy(
                    proxy,
                    ratioUnder,
                    0,
                    0,
                    targetRatio,
                    false,
                );
            });

            it('... should call Spark Repay strategy', async () => {
                const ratioBefore = await sparkView.getRatio(
                    addrs[network].SPARK_MARKET,
                    proxyAddr,
                );
                console.log(`Spark position ratio: ${ratioBefore / 1e16}%`);

                const repayAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, '2000'),
                    collAssetInfo.decimals,
                );

                await callSparkRepayStrategy(
                    botAcc,
                    strategyExecutor,
                    subIds.firstSub,
                    collAssetId,
                    debtAssetId,
                    collAddr,
                    debtAddr,
                    repayAmount,
                    0,
                    subIds.repaySub,
                );

                const ratioAfter = await sparkView.getRatio(addrs[network].SPARK_MARKET, proxyAddr);
                console.log(`Spark position ratio: ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.gt(ratioBefore);
            });

            it('... should call Spark With FL Repay strategy', async () => {
                const ratioBefore = await sparkView.getRatio(
                    addrs[network].SPARK_MARKET,
                    proxyAddr,
                );
                console.log(`Spark position ratio: ${ratioBefore / 1e16}%`);

                const targetRatio = hre.ethers.utils.parseUnits('2.2', '18');
                const ratioUnder = hre.ethers.utils.parseUnits('2', '18');

                subIds = await updateSparkAutomationStrategy(
                    proxy,
                    subIds.firstSub,
                    subIds.secondSub,
                    ratioUnder.toHexString().slice(2),
                    '0',
                    '0',
                    targetRatio.toHexString().slice(2),
                    false,
                );

                const repayAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, '2300'),
                    collAssetInfo.decimals,
                );

                await callSparkFLRepayStrategy(
                    botAcc,
                    strategyExecutor,
                    subIds.firstSub,
                    collAssetId,
                    collAddr,
                    debtAddr,
                    debtAssetId,
                    repayAmount,
                    flAddr,
                    1,
                    subIds.repaySub,
                );

                const ratioAfter = await sparkView.getRatio(addrs[network].SPARK_MARKET, proxyAddr);
                console.log(`Spark position ratio: ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.gt(ratioBefore);
            });
        }
    });
};

const sparkBoostStrategyTest = async (numTestPairs) => {
    describe('Spark-Boost-Strategy-Test', function () {
        this.timeout(1200000);

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let pool;
        let sparkView;
        let subIds;
        let collAssetId;
        let debtAssetId;
        let flAddr;

        before(async () => {
            console.log(`Network: ${network}`);

            await resetForkToBlock();

            configure({
                chainId: chainIds[network],
                testMode: true,
            });

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            proxyAddr = proxy.address;

            console.log('proxyAddr: ', proxyAddr);

            const sparkMarketContract = await hre.ethers.getContractAt(
                'IPoolAddressesProvider',
                addrs[network].SPARK_MARKET,
            );
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore();

            await redeploy('SparkWithdraw');
            await redeploy('SparkPayback');
            await redeploy('SparkRatioTrigger');
            await redeploy('GasFeeTaker');
            await redeploy('DFSSell');
            await redeploy('SparkSupply');
            await redeploy('SparkBorrow');
            await redeploy('SparkRatioCheck');
            await redeploy('SparkView');

            ({ address: flAddr } = await redeploy('FLAction'));

            sparkView = await getContractFromRegistry('SparkView');

            await setNewExchangeWrapper(senderAcc, addrs[network].UNISWAP_V3_WRAPPER);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);
            await deployBundles();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should make a Spark Boost bundle and subscribe', async () => {
                const amount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, '25000'),
                    collAssetInfo.decimals,
                );
                await setBalance(collAddr, senderAcc.address, amount);

                const reserveData = await pool.getReserveData(collAddr);
                collAssetId = reserveData.id;

                await sparkSupply(
                    proxy,
                    addrs[network].SPARK_MARKET,
                    amount,
                    collAddr,
                    collAssetId,
                    senderAcc.address,
                );

                const reserveDataDebt = await pool.getReserveData(debtAddr);

                const amountDebt = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].debtAsset, '10000'),
                    debtAssetInfo.decimals,
                );
                debtAssetId = reserveDataDebt.id;

                await sparkBorrow(
                    proxy,
                    addrs[network].SPARK_MARKET,
                    amountDebt,
                    senderAcc.address,
                    2,
                    debtAssetId,
                );

                const targetRatio = 150;
                const ratioOver = 170;

                subIds = await subSparkAutomationStrategy(
                    proxy,
                    0,
                    ratioOver,
                    targetRatio,
                    0,
                    true,
                );
            });

            it('... should call Spark Boost strategy', async () => {
                const ratioBefore = await sparkView.getRatio(
                    addrs[network].SPARK_MARKET,
                    proxyAddr,
                );
                console.log(`Spark position ratio: ${ratioBefore / 1e16}%`);

                const boostAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].debtAsset, '1000'),
                    debtAssetInfo.decimals,
                );

                await callSparkBoostStrategy(
                    botAcc,
                    strategyExecutor,
                    subIds.secondSub,
                    collAddr,
                    debtAddr,
                    collAssetId,
                    debtAssetId,
                    boostAmount,
                    0, // strategyIndex
                    subIds.boostSub,
                );

                const ratioAfter = await sparkView.getRatio(addrs[network].SPARK_MARKET, proxyAddr);
                console.log(`Spark position ratio: ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.lt(ratioBefore);
            });

            it('... should call Spark With FL Boost strategy', async () => {
                const ratioBefore = await sparkView.getRatio(
                    addrs[network].SPARK_MARKET,
                    proxyAddr,
                );
                console.log(`Spark position ratio: ${ratioBefore / 1e16}%`);

                const targetRatio = hre.ethers.utils.parseUnits('1.5', '18');
                const ratioOver = hre.ethers.utils.parseUnits('1.7', '18');

                // update
                subIds = await updateSparkAutomationStrategy(
                    proxy,
                    subIds.firstSub,
                    subIds.secondSub,
                    '0',
                    ratioOver.toHexString().slice(2),
                    targetRatio.toHexString().slice(2),
                    '0',
                    true,
                );

                const boostAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].debtAsset, '1000'),
                    debtAssetInfo.decimals,
                );

                try {
                    await callSparkFLBoostStrategy(
                        botAcc,
                        strategyExecutor,
                        subIds.secondSub,
                        collAddr,
                        debtAddr,
                        collAssetId,
                        debtAssetId,
                        boostAmount,
                        flAddr,
                        1, // strategyIndex
                        subIds.boostSub,
                    );
                } catch (error) {
                    console.log(error);
                    throw error;
                }

                const ratioAfter = await sparkView.getRatio(addrs[network].SPARK_MARKET, proxyAddr);
                console.log(`Spark position ratio: ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.lt(ratioBefore);
            });
        }
    });
};

const sparkStrategiesTest = async (numTestPairs) => {
    await sparkBoostStrategyTest(numTestPairs);
    await sparkRepayStrategyTest(numTestPairs);
};

module.exports = {
    sparkStrategiesTest,
    sparkRepayStrategyTest,
    sparkBoostStrategyTest,
    deployBundles,
};
