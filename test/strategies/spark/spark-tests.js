const hre = require('hardhat');
const { expect } = require('chai');

const { configure } = require('@defisaver/sdk');
const { assets, getAssetInfo, utils: { compare } } = require('@defisaver/tokens');

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
    Float2BN,
    nullAddress,
    setNewExchangeWrapper,
    getLocalTokenPrice,
    balanceOf,
    BN2Float,
    takeSnapshot,
    revertToSnapshot,
    ETH_ADDR,
    getContractFromRegistry,
    redeploy,
} = require('../../utils');

const {
    addBotCaller,
    createStrategy,
    createBundle,
    activateSub,
} = require('../../utils-strategies');

const {
    createSparkRepayStrategy,
    createSparkFLRepayStrategy,
    createSparkBoostStrategy,
    createSparkFLBoostStrategy,
    createSparkFLCloseToDebtStrategy,
    createSparkFLCloseToCollStrategy,
    createSparkCloseToDebtStrategy,
    createSparkCloseToCollStrategy,
} = require('../../strategies');

const {
    subSparkAutomationStrategy,
    updateSparkAutomationStrategy,
    subSparkCloseBundle,
} = require('../../strategy-subs');

const {
    callSparkRepayStrategy,
    callSparkFLRepayStrategy,
    callSparkBoostStrategy,
    callSparkFLBoostStrategy,
    callSparkCloseToCollStrategy,
    callSparkCloseToDebtStrategy,
    callSparkFLCloseToDebtStrategy,
    callSparkFLCloseToCollStrategy,
} = require('../../strategy-calls');

const {
    sparkSupply, sparkBorrow,
} = require('../../actions');

const { RATIO_STATE_OVER } = require('../../triggers');
const { execShellCommand } = require('../../../scripts/hardhat-tasks-functions');

const deployBundles = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const sparkRepayStrategyEncoded = createSparkRepayStrategy();
    const sparkRepayFLStrategyEncoded = createSparkFLRepayStrategy();

    const strategyId1 = await createStrategy(proxy, ...sparkRepayStrategyEncoded, true);
    const strategyId2 = await createStrategy(proxy, ...sparkRepayFLStrategyEncoded, true);

    const repayBundleId = await createBundle(proxy, [strategyId1, strategyId2]);
    const sparkBoostStrategyEncoded = createSparkBoostStrategy();
    const sparkBoostFLStrategyEncoded = createSparkFLBoostStrategy();

    const strategyId11 = await createStrategy(proxy, ...sparkBoostStrategyEncoded, true);
    const strategyId22 = await createStrategy(proxy, ...sparkBoostFLStrategyEncoded, true);

    const boostBundleId = await createBundle(proxy, [strategyId11, strategyId22]);

    await getContractFromRegistry('SparkSubProxy', undefined, undefined, isFork, repayBundleId, boostBundleId);
    return { repayBundleId, boostBundleId };
};

const deployCloseToDebtBundle = async (proxy, isFork = undefined, isL1 = true) => {
    await openStrategyAndBundleStorage(isFork);

    const closeStrategy = isL1 ? createSparkCloseToDebtStrategy()
        : createSparkCloseToDebtStrategy();

    const flCloseStrategy = isL1 ? createSparkFLCloseToDebtStrategy()
        : createSparkFLCloseToDebtStrategy();

    const sparkCloseToDebtStrategyId = await createStrategy(
        proxy,
        ...closeStrategy,
        false,
    );
    const sparkFLCloseToDebtStrategyId = await createStrategy(
        proxy,
        ...flCloseStrategy,
        false,
    );
    const sparkCloseToDebtBundleId = await createBundle(
        proxy,
        [sparkCloseToDebtStrategyId, sparkFLCloseToDebtStrategyId],
    );

    return sparkCloseToDebtBundleId;
};

const deployCloseToCollBundle = async (proxy, isFork = undefined, isL1 = true) => {
    await openStrategyAndBundleStorage(isFork);

    const closeStrategy = isL1 ? createSparkCloseToCollStrategy()
        : createSparkCloseToCollStrategy();

    const flCloseStrategy = isL1 ? createSparkFLCloseToCollStrategy()
        : createSparkFLCloseToCollStrategy();

    const sparkCloseToCollStrategyId = await createStrategy(
        proxy,
        ...closeStrategy,
        false,
    );
    const sparkFLCloseToCollStrategyId = await createStrategy(
        proxy,
        ...flCloseStrategy,
        false,
    );
    const sparkCloseToCollBundleId = await createBundle(
        proxy,
        [sparkCloseToCollStrategyId, sparkFLCloseToCollStrategyId],
    );

    return sparkCloseToCollBundleId;
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

            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].SPARK_MARKET);
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
            await deployBundles(proxy);
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
                // eslint-disable-next-line max-len
                const ratioBefore = await sparkView.getRatio(addrs[network].SPARK_MARKET, proxyAddr);
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
                // eslint-disable-next-line max-len
                const ratioBefore = await sparkView.getRatio(addrs[network].SPARK_MARKET, proxyAddr);
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

                // eslint-disable-next-line max-len
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

            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].SPARK_MARKET);
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
            await deployBundles(proxy);
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
                // eslint-disable-next-line max-len
                const ratioBefore = await sparkView.getRatio(addrs[network].SPARK_MARKET, proxyAddr);
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
                // eslint-disable-next-line max-len
                const ratioBefore = await sparkView.getRatio(addrs[network].SPARK_MARKET, proxyAddr);
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
                    const blockNum = await hre.ethers.provider.getBlockNumber();
                    const block = await hre.ethers.provider.getBlockWithTransactions(blockNum);
                    const txHash = block.transactions[0].hash;
                    await execShellCommand(`tenderly export ${txHash}`);
                    throw error;
                }

                const ratioAfter = await sparkView.getRatio(addrs[network].SPARK_MARKET, proxyAddr);
                console.log(`Spark position ratio: ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.lt(ratioBefore);
            });
        }
    });
};

const sparkCloseToDebtStrategyTest = async (numTestPairs) => {
    describe('Spark-Close-to-Debt-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.5;
        const EXPECTED_MAX_INTEREST = 1e-6;
        const PARTIAL_CLOSE = 0.5;
        const RATE_MODE = 2;

        let strategyExecutorByBot;
        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let pool;
        let subId;
        let collAssetId;
        let debtAssetId;
        let bundleId;
        let snapshotId;
        let snapshotId4partial;
        let sub;

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

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].SPARK_MARKET);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore();

            await redeploy('SparkQuotePriceTrigger');
            await redeploy('SparkSupply');
            await redeploy('SparkBorrow');
            await redeploy('SparkPayback');
            await redeploy('SparkWithdraw');
            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');
            await redeploy('SendTokenAndUnwrap');

            const { address: mockWrapperAddr } = await getContractFromRegistry('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToDebtBundle(proxy);

            const collAssetInfo = getAssetInfo('wstETH');
            const amount = Float2BN(
                fetchAmountinUSDPrice(collAssetInfo.symbol, (USD_COLL_OPEN * 2).toString()),
                collAssetInfo.decimals,
            );
            await setBalance(collAssetInfo.address, senderAcc.address, amount);

            const reserveData = await pool.getReserveData(collAssetInfo.address);
            collAssetId = reserveData.id;

            await sparkSupply(
                proxy,
                addrs[network].SPARK_MARKET,
                amount,
                collAssetInfo.address,
                collAssetId,
                senderAcc.address,
            );
            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should subscribe to Spark Close strategy', async () => {
                await revertToSnapshot(snapshotId);
                snapshotId = await takeSnapshot();

                const amount = Float2BN(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, USD_COLL_OPEN),
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

                const amountDebt = Float2BN(
                    fetchAmountinUSDPrice(testPairs[i].debtAsset, USD_DEBT_OPEN),
                    debtAssetInfo.decimals,
                );
                debtAssetId = reserveDataDebt.id;

                await sparkBorrow(
                    proxy,
                    addrs[network].SPARK_MARKET,
                    amountDebt,
                    senderAcc.address,
                    RATE_MODE,
                    debtAssetId,
                );

                await setBalance(debtAddr, senderAcc.address, Float2BN('0'));

                const triggerPrice = Float2BN(`${((getLocalTokenPrice(collAssetInfo.symbol) * 0.8) / (10 ** 8)).toFixed(8)}`, 8);

                ({ subId, strategySub: sub } = await subSparkCloseBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call Spark Close strategy', async () => {
                snapshotId4partial = await takeSnapshot();

                const collAssetBalanceBefore = await balanceOf(
                    compare(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                );

                const debtAssetBalanceBefore = await balanceOf(
                    compare(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                );

                await callSparkCloseToDebtStrategy(
                    strategyExecutorByBot,
                    subId,
                    collAssetInfo,
                    debtAssetInfo,
                    undefined,
                    sub,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    compare(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e.sub(collAssetBalanceBefore),
                    collAssetBalanceFloat: BN2Float(
                        e.sub(collAssetBalanceBefore), collAssetInfo.decimals,
                    ),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    compare(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    debtAssetBalance: e.sub(debtAssetBalanceBefore),
                    debtAssetBalanceFloat: BN2Float(
                        e.sub(debtAssetBalanceBefore), debtAssetInfo.decimals,
                    ),
                }));

                console.log('-----sender coll/debt assets after close-----');
                console.log(`${collAssetInfo.symbol} balance: ${collAssetBalanceFloat} ($${collAssetBalanceFloat * getLocalTokenPrice(collAssetInfo.symbol)})`);
                console.log(`${debtAssetInfo.symbol} balance: ${debtAssetBalanceFloat} ($${debtAssetBalanceFloat * getLocalTokenPrice(debtAssetInfo.symbol)})`);
                console.log('---------------------------------------------');

                expect(await balanceOf(collAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(await balanceOf(debtAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(collAssetBalance).to.be.eq(Float2BN('0'));
                expect(debtAssetBalance).to.be.gt(
                    Float2BN(
                        fetchAmountinUSDPrice(
                            debtAssetInfo.symbol,
                            USD_COLL_OPEN * (1 - ALLOWED_SLIPPAGE)
                            - USD_DEBT_OPEN * (1 + EXPECTED_MAX_INTEREST),
                        ),
                        debtAssetInfo.decimals,
                    ),
                );
            });

            it('... should call partial close', async () => {
                await revertToSnapshot(snapshotId4partial);

                const repayAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        debtAssetInfo.symbol,
                        USD_DEBT_OPEN * PARTIAL_CLOSE,
                    ),
                    debtAssetInfo.decimals,
                );

                const withdrawAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        collAssetInfo.symbol,
                        USD_DEBT_OPEN * PARTIAL_CLOSE * (1 + ALLOWED_SLIPPAGE),
                    ),
                    collAssetInfo.decimals,
                );

                await callSparkCloseToDebtStrategy(
                    strategyExecutorByBot,
                    subId,
                    collAssetInfo,
                    debtAssetInfo,
                    { withdrawAmount, repayAmount },
                    sub,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e,
                    collAssetBalanceFloat: BN2Float(e, collAssetInfo.decimals),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    debtAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    debtAssetBalance: e,
                    debtAssetBalanceFloat: BN2Float(e, debtAssetInfo.decimals),
                }));

                console.log('-----sender coll/debt assets after close-----');
                console.log(`${collAssetInfo.symbol} balance: ${collAssetBalanceFloat} ($${collAssetBalanceFloat * getLocalTokenPrice(collAssetInfo.symbol)})`);
                console.log(`${debtAssetInfo.symbol} balance: ${debtAssetBalanceFloat} ($${debtAssetBalanceFloat * getLocalTokenPrice(debtAssetInfo.symbol)})`);
                console.log('---------------------------------------------');

                expect(await balanceOf(collAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(await balanceOf(debtAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(collAssetBalance).to.be.eq(Float2BN('0'));
                expect(debtAssetBalance).to.be.lt(
                    Float2BN(
                        fetchAmountinUSDPrice(
                            debtAssetInfo.symbol,
                            USD_DEBT_OPEN * PARTIAL_CLOSE * ALLOWED_SLIPPAGE,
                        ),
                        debtAssetInfo.decimals,
                    ),
                );
            });
        }
    });
};

const sparkFLCloseToDebtStrategyTest = async (numTestPairs) => {
    describe('Spark-FL-Close-to-Debt-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.5;
        const EXPECTED_MAX_INTEREST = 1e-6;
        const PARTIAL_CLOSE = 0.5;
        const RATE_MODE = 2;

        let strategyExecutorByBot;
        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let pool;
        let subId;
        let sub;
        let collAssetId;
        let debtAssetId;
        let flAddr;
        let bundleId;
        let snapshotId;
        let snapshotId4partial;

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

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].SPARK_MARKET);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore();

            await redeploy('SparkQuotePriceTrigger');
            await redeploy('SparkSupply');
            await redeploy('SparkBorrow');
            await redeploy('SparkPayback');
            await redeploy('SparkWithdraw');
            await redeploy('SparkRatioCheck');
            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('SendToken');

            const { address: mockWrapperAddr } = await getContractFromRegistry('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            ({ address: flAddr } = await redeploy('FLAction'));

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToDebtBundle(proxy);

            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should subscribe to Spark FL Close strategy', async () => {
                await revertToSnapshot(snapshotId);
                snapshotId = await takeSnapshot();

                const amount = Float2BN(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, USD_COLL_OPEN),
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

                const amountDebt = Float2BN(
                    fetchAmountinUSDPrice(
                        testPairs[i].debtAsset,
                        USD_DEBT_OPEN,
                    ),
                    debtAssetInfo.decimals,
                );
                debtAssetId = reserveDataDebt.id;

                await sparkBorrow(
                    proxy,
                    addrs[network].SPARK_MARKET,
                    amountDebt,
                    senderAcc.address,
                    RATE_MODE,
                    debtAssetId,
                );

                await setBalance(debtAddr, senderAcc.address, Float2BN('0'));

                const triggerPrice = Float2BN(`${((getLocalTokenPrice(collAssetInfo.symbol) * 0.8) / (10 ** 8)).toFixed(8)}`, 8);

                ({ subId, strategySub: sub } = await subSparkCloseBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call Spark FL Close strategy', async () => {
                snapshotId4partial = await takeSnapshot();

                const repayAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        debtAssetInfo.symbol,
                        USD_DEBT_OPEN * (1 + EXPECTED_MAX_INTEREST),
                    ),
                    debtAssetInfo.decimals,
                );

                const collAssetBalanceBefore = await balanceOf(
                    compare(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                );

                const debtAssetBalanceBefore = await balanceOf(
                    compare(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                );

                await callSparkFLCloseToDebtStrategy(
                    strategyExecutorByBot,
                    subId,
                    repayAmount,
                    debtAddr,
                    flAddr,
                    collAssetInfo,
                    debtAssetInfo,
                    undefined,
                    sub,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    compare(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e.sub(collAssetBalanceBefore),
                    collAssetBalanceFloat: BN2Float(
                        e.sub(collAssetBalanceBefore), collAssetInfo.decimals,
                    ),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    compare(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    debtAssetBalance: e.sub(debtAssetBalanceBefore),
                    debtAssetBalanceFloat: BN2Float(
                        e.sub(debtAssetBalanceBefore), debtAssetInfo.decimals,
                    ),
                }));

                console.log('-----sender coll/debt assets after close-----');
                console.log(`${collAssetInfo.symbol} balance: ${collAssetBalanceFloat} ($${collAssetBalanceFloat * getLocalTokenPrice(collAssetInfo.symbol)})`);
                console.log(`${debtAssetInfo.symbol} balance: ${debtAssetBalanceFloat} ($${debtAssetBalanceFloat * getLocalTokenPrice(debtAssetInfo.symbol)})`);
                console.log('---------------------------------------------');

                expect(await balanceOf(collAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(await balanceOf(debtAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(collAssetBalance).to.be.eq(Float2BN('0'));
                expect(debtAssetBalance).to.be.gte(
                    Float2BN(
                        fetchAmountinUSDPrice(
                            debtAssetInfo.symbol,
                            USD_COLL_OPEN * (1 - ALLOWED_SLIPPAGE)
                            - USD_DEBT_OPEN * (1 + EXPECTED_MAX_INTEREST),
                        ),
                        debtAssetInfo.decimals,
                    ),
                );
            });

            it('... should call partial close', async () => {
                await revertToSnapshot(snapshotId4partial);

                const repayAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        debtAssetInfo.symbol,
                        USD_DEBT_OPEN * PARTIAL_CLOSE,
                    ),
                    debtAssetInfo.decimals,
                );

                const withdrawAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        collAssetInfo.symbol,
                        USD_DEBT_OPEN * PARTIAL_CLOSE * (1 + ALLOWED_SLIPPAGE),
                    ),
                    collAssetInfo.decimals,
                );

                await callSparkFLCloseToDebtStrategy(
                    strategyExecutorByBot,
                    subId,
                    repayAmount,
                    debtAddr,
                    flAddr,
                    collAssetInfo,
                    debtAssetInfo,
                    withdrawAmount,
                    sub,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e,
                    collAssetBalanceFloat: BN2Float(e, collAssetInfo.decimals),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    debtAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    debtAssetBalance: e,
                    debtAssetBalanceFloat: BN2Float(e, debtAssetInfo.decimals),
                }));

                console.log('-----sender coll/debt assets after close-----');
                console.log(`${collAssetInfo.symbol} balance: ${collAssetBalanceFloat} ($${collAssetBalanceFloat * getLocalTokenPrice(collAssetInfo.symbol)})`);
                console.log(`${debtAssetInfo.symbol} balance: ${debtAssetBalanceFloat} ($${debtAssetBalanceFloat * getLocalTokenPrice(debtAssetInfo.symbol)})`);
                console.log('---------------------------------------------');

                expect(await balanceOf(collAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(await balanceOf(debtAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(collAssetBalance).to.be.eq(Float2BN('0'));
                expect(debtAssetBalance).to.be.lte(
                    Float2BN(
                        fetchAmountinUSDPrice(
                            debtAssetInfo.symbol,
                            USD_DEBT_OPEN * PARTIAL_CLOSE * ALLOWED_SLIPPAGE,
                        ),
                        debtAssetInfo.decimals,
                    ),
                );
            });
        }
    });
};

const sparkCloseToCollStrategyTest = async (numTestPairs) => {
    describe('Spark-Close-to-Coll-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.05;
        const PARTIAL_CLOSE = 0.5;
        const EXPECTED_MAX_INTEREST = 1e-6;
        const EXPECTED_MAX_FEE = 5e-1; // gas + dfs fee
        const RATE_MODE = 2;

        let strategyExecutorByBot;
        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let pool;
        let subId;
        let sub;
        let collAssetId;
        let debtAssetId;
        let bundleId;
        let snapshotId;
        let snapshotId4partial;

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

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].SPARK_MARKET);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore();

            await redeploy('SparkQuotePriceTrigger');
            await redeploy('SparkSupply');
            await redeploy('SparkBorrow');
            await redeploy('SparkPayback');
            await redeploy('SparkWithdraw');
            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('SendToken');

            const { address: mockWrapperAddr } = await getContractFromRegistry('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToCollBundle(proxy);

            const collAssetInfo = getAssetInfo('wstETH');
            const amount = Float2BN(
                fetchAmountinUSDPrice(collAssetInfo.symbol, (USD_COLL_OPEN * 2).toString()),
                collAssetInfo.decimals,
            );
            await setBalance(collAssetInfo.address, senderAcc.address, amount);

            const reserveData = await pool.getReserveData(collAssetInfo.address);
            collAssetId = reserveData.id;

            await sparkSupply(
                proxy,
                addrs[network].SPARK_MARKET,
                amount,
                collAssetInfo.address,
                collAssetId,
                senderAcc.address,
            );
            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should subscribe to Spark Close strategy', async () => {
                await revertToSnapshot(snapshotId);
                snapshotId = await takeSnapshot();

                const amount = Float2BN(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, USD_COLL_OPEN),
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

                const amountDebt = Float2BN(
                    fetchAmountinUSDPrice(testPairs[i].debtAsset, USD_DEBT_OPEN),
                    debtAssetInfo.decimals,
                );
                debtAssetId = reserveDataDebt.id;

                await sparkBorrow(
                    proxy,
                    addrs[network].SPARK_MARKET,
                    amountDebt,
                    senderAcc.address,
                    RATE_MODE,
                    debtAssetId,
                );

                await setBalance(debtAddr, senderAcc.address, Float2BN('0'));

                const triggerPrice = Float2BN(`${((getLocalTokenPrice(collAssetInfo.symbol) * 0.8) / (10 ** 8)).toFixed(8)}`, 8);

                ({ subId, strategySub: sub } = await subSparkCloseBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call Spark Close strategy', async () => {
                snapshotId4partial = await takeSnapshot();
                // eslint-disable-next-line max-len
                const usdRepayAmount = USD_DEBT_OPEN * (1 + EXPECTED_MAX_INTEREST);
                const usdSwapAmount = usdRepayAmount * (1 + ALLOWED_SLIPPAGE);
                const swapAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        collAssetInfo.symbol,
                        usdSwapAmount,
                    ),
                    collAssetInfo.decimals,
                );

                const collAssetBalanceBefore = await balanceOf(
                    compare(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                );

                const debtAssetBalanceBefore = await balanceOf(
                    compare(debtAddr, getAssetInfo('WETH', chainIds[network]).address, chainIds[network]) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                );

                await callSparkCloseToCollStrategy(
                    strategyExecutorByBot,
                    subId,
                    swapAmount,
                    collAssetInfo,
                    debtAssetInfo,
                    undefined,
                    sub,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    compare(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e.sub(collAssetBalanceBefore),
                    collAssetBalanceFloat: BN2Float(
                        e.sub(collAssetBalanceBefore), collAssetInfo.decimals,
                    ),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    compare(debtAddr, getAssetInfo('WETH', chainIds[network]).address, chainIds[network]) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    debtAssetBalance: e.sub(debtAssetBalanceBefore),
                    debtAssetBalanceFloat: BN2Float(
                        e.sub(debtAssetBalanceBefore), debtAssetInfo.decimals,
                    ),
                }));

                console.log('-----sender coll/debt assets after close-----');
                console.log(`${collAssetInfo.symbol} balance: ${collAssetBalanceFloat} ($${collAssetBalanceFloat * getLocalTokenPrice(collAssetInfo.symbol)})`);
                console.log(`${debtAssetInfo.symbol} balance: ${debtAssetBalanceFloat} ($${debtAssetBalanceFloat * getLocalTokenPrice(debtAssetInfo.symbol)})`);
                console.log('---------------------------------------------');

                expect(await balanceOf(collAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(await balanceOf(debtAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(
                    collAssetBalance,
                ).to.be.gt(
                    Float2BN(
                        fetchAmountinUSDPrice(
                            collAssetInfo.symbol,
                            (USD_COLL_OPEN - usdSwapAmount) * (1 - EXPECTED_MAX_FEE),
                        ),
                        collAssetInfo.decimals,
                    ),
                );
                expect(debtAssetBalance).to.be.lte(
                    Float2BN(
                        fetchAmountinUSDPrice(
                            debtAssetInfo.symbol,
                            usdRepayAmount * ALLOWED_SLIPPAGE,
                        ),
                        debtAssetInfo.decimals,
                    ),
                );
            });

            it('... should call partial close', async () => {
                await revertToSnapshot(snapshotId4partial);

                const usdRepayAmount = USD_DEBT_OPEN * PARTIAL_CLOSE;
                const repayAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        debtAssetInfo.symbol,
                        usdRepayAmount,
                    ),
                    debtAssetInfo.decimals,
                );

                const usdSwapAmount = usdRepayAmount * (1 + ALLOWED_SLIPPAGE);
                const usdWithdrawAmount = usdSwapAmount * (1 + EXPECTED_MAX_FEE);
                const withdrawAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        collAssetInfo.symbol,
                        usdWithdrawAmount,
                    ),
                    collAssetInfo.decimals,
                );

                await callSparkCloseToCollStrategy(
                    strategyExecutorByBot,
                    subId,
                    0, // will be maxuint
                    collAssetInfo,
                    debtAssetInfo,
                    { withdrawAmount, repayAmount },
                    sub,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e,
                    collAssetBalanceFloat: BN2Float(e, collAssetInfo.decimals),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    debtAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    debtAssetBalance: e,
                    debtAssetBalanceFloat: BN2Float(e, debtAssetInfo.decimals),
                }));

                console.log('-----sender coll/debt assets after close-----');
                console.log(`${collAssetInfo.symbol} balance: ${collAssetBalanceFloat} ($${collAssetBalanceFloat * getLocalTokenPrice(collAssetInfo.symbol)})`);
                console.log(`${debtAssetInfo.symbol} balance: ${debtAssetBalanceFloat} ($${debtAssetBalanceFloat * getLocalTokenPrice(debtAssetInfo.symbol)})`);
                console.log('---------------------------------------------');

                expect(await balanceOf(collAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(await balanceOf(debtAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(collAssetBalance).to.be.eq(0);
                expect(debtAssetBalance).to.be.lt(
                    Float2BN(
                        fetchAmountinUSDPrice(
                            debtAssetInfo.symbol,
                            usdWithdrawAmount - usdRepayAmount,
                        ),
                        debtAssetInfo.decimals,
                    ),
                );
            });
        }
    });
};

const sparkFLCloseToCollStrategyTest = async (numTestPairs) => {
    describe('Spark-FL-Close-to-Coll-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.03;
        const EXPECTED_MAX_INTEREST = 1e-6;
        const EXPECTED_MAX_FEE = 5e-1; // gas + dfsFee
        const PARTIAL_CLOSE = 0.5;
        const RATE_MODE = 2;

        let strategyExecutorByBot;
        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let pool;
        let subId;
        let sub;
        let collAssetId;
        let debtAssetId;
        let flAddr;
        let bundleId;
        let snapshotId;
        let snapshotId4partial;

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

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            const sparkMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].SPARK_MARKET);
            const poolAddress = await sparkMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore();

            await getContractFromRegistry('SparkQuotePriceTrigger');
            await getContractFromRegistry('SparkSupply');
            await getContractFromRegistry('SparkBorrow');
            await getContractFromRegistry('SparkWithdraw');
            await getContractFromRegistry('SparkPayback');
            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('SendToken');

            const { address: mockWrapperAddr } = await getContractFromRegistry('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            ({ address: flAddr } = await redeploy('FLAction'));

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToCollBundle(proxy);

            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should make a Spark FL Close strategy and subscribe', async () => {
                await revertToSnapshot(snapshotId);
                snapshotId = await takeSnapshot();

                const amount = Float2BN(
                    fetchAmountinUSDPrice(
                        testPairs[i].collAsset,
                        USD_COLL_OPEN,
                    ),
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
                const amountDebt = Float2BN(
                    fetchAmountinUSDPrice(
                        testPairs[i].debtAsset,
                        USD_DEBT_OPEN,
                    ),
                    debtAssetInfo.decimals,
                );
                debtAssetId = reserveDataDebt.id;

                await sparkBorrow(
                    proxy,
                    addrs[network].SPARK_MARKET,
                    amountDebt,
                    senderAcc.address,
                    RATE_MODE,
                    debtAssetId,
                );

                await setBalance(debtAddr, senderAcc.address, Float2BN('0'));

                const triggerPrice = Float2BN(`${((getLocalTokenPrice(collAssetInfo.symbol) * 0.8) / (10 ** 8)).toFixed(8)}`, 8);

                ({ subId, strategySub: sub } = await subSparkCloseBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call Spark FL Close strategy', async () => {
                snapshotId4partial = await takeSnapshot();

                const usdRepayAmount = USD_DEBT_OPEN * (1 + EXPECTED_MAX_INTEREST);
                const repayAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        debtAssetInfo.symbol,
                        usdRepayAmount,
                    ),
                    debtAssetInfo.decimals,
                );

                // eslint-disable-next-line max-len
                const usdSwapAmount = usdRepayAmount * (1 + ALLOWED_SLIPPAGE);
                const swapAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        collAssetInfo.symbol,
                        usdSwapAmount,
                    ),
                    collAssetInfo.decimals,
                );

                const collAssetBalanceBefore = await balanceOf(
                    compare(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                );

                const debtAssetBalanceBefore = await balanceOf(
                    compare(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                );

                await callSparkFLCloseToCollStrategy(
                    strategyExecutorByBot,
                    subId,
                    repayAmount,
                    debtAddr,
                    flAddr,
                    swapAmount,
                    collAssetInfo,
                    debtAssetInfo,
                    undefined,
                    sub,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    compare(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e.sub(collAssetBalanceBefore),
                    collAssetBalanceFloat: BN2Float(
                        e.sub(collAssetBalanceBefore), collAssetInfo.decimals,
                    ),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    compare(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    debtAssetBalance: e.sub(debtAssetBalanceBefore),
                    debtAssetBalanceFloat: BN2Float(
                        e.sub(debtAssetBalanceBefore), debtAssetInfo.decimals,
                    ),
                }));

                console.log('-----sender coll/debt assets after close-----');
                console.log(`${collAssetInfo.symbol} balance: ${collAssetBalanceFloat} ($${collAssetBalanceFloat * getLocalTokenPrice(collAssetInfo.symbol)})`);
                console.log(`${debtAssetInfo.symbol} balance: ${debtAssetBalanceFloat} ($${debtAssetBalanceFloat * getLocalTokenPrice(debtAssetInfo.symbol)})`);
                console.log('---------------------------------------------');

                expect(await balanceOf(collAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(await balanceOf(debtAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(
                    collAssetBalance,
                ).to.be.gt(
                    Float2BN(
                        fetchAmountinUSDPrice(
                            collAssetInfo.symbol,
                            (USD_COLL_OPEN - usdSwapAmount) * (1 - EXPECTED_MAX_FEE),
                        ),
                        collAssetInfo.decimals,
                    ),
                );
                expect(debtAssetBalance).to.be.lte(
                    Float2BN(
                        fetchAmountinUSDPrice(
                            debtAssetInfo.symbol,
                            usdRepayAmount * ALLOWED_SLIPPAGE,
                        ),
                        debtAssetInfo.decimals,
                    ),
                );
            });

            it('... should call partial close', async () => {
                await revertToSnapshot(snapshotId4partial);

                const usdRepayAmount = USD_DEBT_OPEN * PARTIAL_CLOSE;
                const repayAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        debtAssetInfo.symbol,
                        usdRepayAmount,
                    ),
                    debtAssetInfo.decimals,
                );

                const usdSwapAmount = usdRepayAmount * (1 + ALLOWED_SLIPPAGE);
                const usdWithdrawAmount = usdSwapAmount * (1 + EXPECTED_MAX_FEE);
                const withdrawAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        collAssetInfo.symbol,
                        usdWithdrawAmount,
                    ),
                    collAssetInfo.decimals,
                );

                await callSparkFLCloseToCollStrategy(
                    strategyExecutorByBot,
                    subId,
                    repayAmount,
                    debtAddr,
                    flAddr,
                    0, // will be maxuint
                    collAssetInfo,
                    debtAssetInfo,
                    withdrawAmount,
                    sub,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e,
                    collAssetBalanceFloat: BN2Float(e, collAssetInfo.decimals),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    debtAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    debtAssetBalance: e,
                    debtAssetBalanceFloat: BN2Float(e, debtAssetInfo.decimals),
                }));

                console.log('-----sender coll/debt assets after close-----');
                console.log(`${collAssetInfo.symbol} balance: ${collAssetBalanceFloat} ($${collAssetBalanceFloat * getLocalTokenPrice(collAssetInfo.symbol)})`);
                console.log(`${debtAssetInfo.symbol} balance: ${debtAssetBalanceFloat} ($${debtAssetBalanceFloat * getLocalTokenPrice(debtAssetInfo.symbol)})`);
                console.log('---------------------------------------------');

                expect(await balanceOf(collAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(await balanceOf(debtAddr, proxyAddr)).to.be.eq(Float2BN('0'));
                expect(collAssetBalance).to.be.eq(0);
                expect(debtAssetBalance).to.be.lt(
                    Float2BN(
                        fetchAmountinUSDPrice(
                            debtAssetInfo.symbol,
                            usdWithdrawAmount - usdRepayAmount,
                        ),
                        debtAssetInfo.decimals,
                    ),
                );
            });
        }
    });
};

const sparkStrategiesTest = async (numTestPairs) => {
    await sparkBoostStrategyTest(numTestPairs);
    await sparkRepayStrategyTest(numTestPairs);

    await sparkCloseToDebtStrategyTest(numTestPairs);
    await sparkFLCloseToDebtStrategyTest(numTestPairs);
    await sparkCloseToCollStrategyTest(numTestPairs);
    await sparkFLCloseToCollStrategyTest(numTestPairs);
};

module.exports = {
    sparkStrategiesTest,
    sparkRepayStrategyTest,
    sparkBoostStrategyTest,
    sparkCloseToDebtStrategyTest,
    sparkFLCloseToDebtStrategyTest,
    sparkCloseToCollStrategyTest,
    sparkFLCloseToCollStrategyTest,

    deployBundles,
    deployCloseToDebtBundle,
    deployCloseToCollBundle,
};
