const hre = require('hardhat');
const { expect } = require('chai');

const { configure } = require('@defisaver/sdk');
const { assets, getAssetInfo, utils: { compare } } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
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
    BLOCKS_PER_6H,
} = require('../../utils');

const {
    addBotCaller,
    createStrategy,
    createBundle,
    activateSub,
} = require('../../utils-strategies');

const {
    createAaveV3RepayL2Strategy,
    createAaveFLV3RepayL2Strategy,
    createAaveV3BoostL2Strategy,
    createAaveFLV3BoostL2Strategy,
    createAaveV3FLCloseToDebtL2Strategy,
    createAaveV3FLCloseToCollL2Strategy,
    createAaveV3CloseToDebtL2Strategy,
    createAaveV3CloseToCollL2Strategy,
} = require('../../l2-strategies');

const {
    createAaveV3CloseToCollStrategy,
    createAaveV3FLCloseToCollStrategy,
    createAaveV3CloseToDebtStrategy,
    createAaveV3FLCloseToDebtStrategy,
} = require('../../strategies');
const {
    subAaveV3L2AutomationStrategy,
    updateAaveV3L2AutomationStrategy,
    subAaveV3CloseBundle,
} = require('../../l2-strategy-subs');

const {
    callAaveV3RepayL2Strategy,
    callAaveFLV3RepayL2Strategy,
    callAaveV3BoostL2Strategy,
    callAaveFLV3BoostL2Strategy,
    callAaveCloseToCollL2Strategy,
    callAaveCloseToDebtL2Strategy,
    callAaveFLCloseToDebtL2Strategy,
    callAaveFLCloseToCollL2Strategy,
} = require('../../l2-strategy-calls');

const {
    callAaveCloseToCollStrategy,
    callAaveFLCloseToCollStrategy,
    callAaveCloseToDebtStrategy,
    callAaveFLCloseToDebtStrategy,
} = require('../../strategy-calls');

const {
    aaveV3Supply, aaveV3Borrow,
} = require('../../actions');

const { RATIO_STATE_OVER } = require('../../triggers');
const { execShellCommand } = require('../../../scripts/hardhat-tasks-functions');

const deployBundles = async (proxy) => {
    await openStrategyAndBundleStorage();
    const aaveRepayStrategyEncoded = createAaveV3RepayL2Strategy();
    const aaveRepayFLStrategyEncoded = createAaveFLV3RepayL2Strategy();

    const strategyId1 = await createStrategy(proxy, ...aaveRepayStrategyEncoded, true);
    const strategyId2 = await createStrategy(proxy, ...aaveRepayFLStrategyEncoded, true);

    await createBundle(proxy, [strategyId1, strategyId2]);

    const aaveBoostStrategyEncoded = createAaveV3BoostL2Strategy();
    const aaveBoostFLStrategyEncoded = createAaveFLV3BoostL2Strategy();

    const strategyId11 = await createStrategy(proxy, ...aaveBoostStrategyEncoded, true);
    const strategyId22 = await createStrategy(proxy, ...aaveBoostFLStrategyEncoded, true);

    await createBundle(proxy, [strategyId11, strategyId22]);
};

const deployCloseToDebtBundle = async (proxy, isFork = undefined, isL1 = false) => {
    await openStrategyAndBundleStorage(isFork);

    const closeStrategy = isL1 ? createAaveV3CloseToDebtStrategy()
        : createAaveV3CloseToDebtL2Strategy();

    const flCloseStrategy = isL1 ? createAaveV3FLCloseToDebtStrategy()
        : createAaveV3FLCloseToDebtL2Strategy();

    const aaveV3CloseToDebtL2StrategyId = await createStrategy(
        proxy,
        ...closeStrategy,
        false,
    );
    const aaveV3FLCloseToDebtL2StrategyId = await createStrategy(
        proxy,
        ...flCloseStrategy,
        false,
    );
    const aaveV3CloseToDebtBundleId = await createBundle(
        proxy,
        [aaveV3CloseToDebtL2StrategyId, aaveV3FLCloseToDebtL2StrategyId],
    );

    return aaveV3CloseToDebtBundleId;
};

const deployCloseToCollBundle = async (proxy, isFork = undefined, isL1 = false) => {
    await openStrategyAndBundleStorage(isFork);

    const closeStrategy = isL1 ? createAaveV3CloseToCollStrategy()
        : createAaveV3CloseToCollL2Strategy();

    const flCloseStrategy = isL1 ? createAaveV3FLCloseToCollStrategy()
        : createAaveV3FLCloseToCollL2Strategy();

    const aaveV3CloseToCollL2StrategyId = await createStrategy(
        proxy,
        ...closeStrategy,
        false,
    );
    const aaveV3FLCloseToCollL2StrategyId = await createStrategy(
        proxy,
        ...flCloseStrategy,
        false,
    );
    const aaveV3CloseToCollBundleId = await createBundle(
        proxy,
        [aaveV3CloseToCollL2StrategyId, aaveV3FLCloseToCollL2StrategyId],
    );

    return aaveV3CloseToCollBundleId;
};

const testPairs = [
    {
        collAsset: 'WETH',
        debtAsset: 'DAI',
    },
    {
        collAsset: 'WBTC',
        debtAsset: 'USDC',
    },
    {
        collAsset: 'DAI',
        debtAsset: 'WETH',
    },
];

const aaveV3RepayStrategyTest = async (numTestPairs) => {
    describe('AaveV3-Repay-Strategy-Test', function () {
        this.timeout(1200000);

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let pool;
        let aaveView;
        let subIds;
        let collAssetId;
        let debtAssetId;
        let flAction;

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

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore(true);

            await redeploy('BotAuth');
            await redeploy('AaveV3RatioTrigger');
            await redeploy('GasFeeTakerL2');
            await redeploy('DFSSell');
            await redeploy('AaveV3Payback');
            await redeploy('AaveV3Withdraw');
            await redeploy('AaveV3RatioCheck');
            flAction = await redeploy('FLAction');

            aaveView = await redeploy('AaveV3View');

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should make a AaveV3 Repay bundle and subscribe', async () => {
                const amount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, '20000'),
                    collAssetInfo.decimals,
                );
                await setBalance(collAddr, senderAcc.address, amount);

                const reserveData = await pool.getReserveData(collAddr);
                collAssetId = reserveData.id;

                await aaveV3Supply(
                    proxy,
                    addrs[network].AAVE_MARKET,
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

                await aaveV3Borrow(
                    proxy,
                    addrs[network].AAVE_MARKET,
                    amountDebt,
                    senderAcc.address,
                    2,
                    debtAssetId,
                );

                await deployBundles(proxy);

                const targetRatio = 230;
                const ratioUnder = 220;

                subIds = await subAaveV3L2AutomationStrategy(
                    proxy,
                    ratioUnder,
                    0,
                    0,
                    targetRatio,
                    false,
                );
            });

            it('... should call AaveV3 Repay strategy', async () => {
                const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
                console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

                const repayAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, '2000'),
                    collAssetInfo.decimals,
                );

                await callAaveV3RepayL2Strategy(
                    botAcc,
                    strategyExecutor,
                    subIds.firstSub,
                    collAssetId,
                    debtAssetId,
                    collAddr,
                    debtAddr,
                    repayAmount,
                    0,
                );

                const ratioAfter = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
                console.log(`Aave position ratio: ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.gt(ratioBefore);
            });

            it('... should call AaveV3 With FL Repay strategy', async () => {
                const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
                console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

                const targetRatio = hre.ethers.utils.parseUnits('2.2', '18');
                const ratioUnder = hre.ethers.utils.parseUnits('2', '18');

                await updateAaveV3L2AutomationStrategy(
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
                await callAaveFLV3RepayL2Strategy(
                    botAcc,
                    strategyExecutor,
                    subIds.firstSub,
                    collAssetId,
                    collAddr,
                    debtAddr,
                    debtAssetId,
                    repayAmount,
                    flAction.address,
                    1,
                );

                const ratioAfter = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
                console.log(`Aave position ratio: ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.gt(ratioBefore);
            });
        }
    });
};

const aaveV3BoostStrategyTest = async (numTestPairs) => {
    describe('AaveV3-Boost-Strategy-Test', function () {
        this.timeout(1200000);

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let pool;
        let aaveView;
        let subIds;
        let collAssetId;
        let debtAssetId;
        let flAction;

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

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore(true);

            await redeploy('BotAuth');
            await redeploy('AaveV3RatioTrigger');
            await redeploy('GasFeeTakerL2');
            await redeploy('DFSSell');
            await redeploy('AaveV3Supply');
            await redeploy('AaveV3Borrow');
            await redeploy('AaveV3RatioCheck');
            flAction = await redeploy('FLAction');

            aaveView = await redeploy('AaveV3View');

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should make a AaveV3 Boost bundle and subscribe', async () => {
                const amount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, '25000'),
                    collAssetInfo.decimals,
                );
                await setBalance(collAddr, senderAcc.address, amount);

                const reserveData = await pool.getReserveData(collAddr);
                collAssetId = reserveData.id;

                await aaveV3Supply(
                    proxy,
                    addrs[network].AAVE_MARKET,
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

                await aaveV3Borrow(
                    proxy,
                    addrs[network].AAVE_MARKET,
                    amountDebt,
                    senderAcc.address,
                    2,
                    debtAssetId,
                );

                await deployBundles(proxy);

                const targetRatio = 150;
                const ratioOver = 170;

                subIds = await subAaveV3L2AutomationStrategy(
                    proxy,
                    0,
                    ratioOver,
                    targetRatio,
                    0,
                    true,
                );
            });

            it('... should call AaveV3 Boost strategy', async () => {
                const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
                console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

                const boostAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].debtAsset, '1000'),
                    debtAssetInfo.decimals,
                );

                await callAaveV3BoostL2Strategy(
                    botAcc,
                    strategyExecutor,
                    subIds.secondSub,
                    collAddr,
                    debtAddr,
                    collAssetId,
                    debtAssetId,
                    boostAmount,
                    0, // strategyIndex
                );

                const ratioAfter = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
                console.log(`Aave position ratio: ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.lt(ratioBefore);
            });

            it('... should call AaveV3 With FL Boost strategy', async () => {
                const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
                console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

                const targetRatio = hre.ethers.utils.parseUnits('1.5', '18');
                const ratioOver = hre.ethers.utils.parseUnits('1.7', '18');

                // update
                subIds = await updateAaveV3L2AutomationStrategy(
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
                    await callAaveFLV3BoostL2Strategy(
                        botAcc,
                        strategyExecutor,
                        subIds.secondSub,
                        collAddr,
                        debtAddr,
                        collAssetId,
                        debtAssetId,
                        boostAmount,
                        flAction.address,
                        1, // strategyIndex
                    );
                } catch (error) {
                    console.log(error);
                    const blockNum = await hre.ethers.provider.getBlockNumber();
                    const block = await hre.ethers.provider.getBlockWithTransactions(blockNum);
                    const txHash = block.transactions[0].hash;
                    await execShellCommand(`tenderly export ${txHash}`);
                    throw error;
                }

                const ratioAfter = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
                console.log(`Aave position ratio: ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.lt(ratioBefore);
            });
        }
    });
};

const aaveV3CloseToDebtStrategyTest = async (numTestPairs) => {
    describe('AaveV3-Close-to-Debt-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.05;
        const EXPECTED_MAX_INTEREST = 1e-6;
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
        let strategySub;
        let isL2 = true;

        before(async () => {
            console.log(`Network: ${network}`);

            await hre.ethers.provider.getBlockNumber()
                .then((e) => resetForkToBlock(Math.floor(e / BLOCKS_PER_6H) * BLOCKS_PER_6H));

            if (network === 'mainnet') {
                isL2 = false;
            }

            configure({
                chainId: chainIds[network],
                testMode: true,
            });

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            proxyAddr = proxy.address;

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore(isL2);

            await redeploy('AaveV3QuotePriceTrigger');
            await redeploy('DFSSell');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('AaveV3Withdraw');
            await redeploy('AaveV3Payback');
            await redeploy('GasFeeTaker');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToDebtBundle(proxy);

            const linkInfo = getAssetInfo('LINK', chainIds[network]);
            const amountLINK = Float2BN(
                (+fetchAmountinUSDPrice(
                    linkInfo.symbol, USD_COLL_OPEN,
                )).toFixed(linkInfo.decimals),
                linkInfo.decimals,
            );
            await setBalance(linkInfo.address, senderAcc.address, amountLINK);

            const reserveDataLINK = await pool.getReserveData(linkInfo.address);
            const linkAssetId = reserveDataLINK.id;

            await aaveV3Supply(
                proxy,
                addrs[network].AAVE_MARKET,
                amountLINK,
                linkInfo.address,
                linkAssetId,
                senderAcc.address,
            );

            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should subscribe to AaveV3 Close strategy', async () => {
                await revertToSnapshot(snapshotId);
                snapshotId = await takeSnapshot();

                const amount = Float2BN(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, USD_COLL_OPEN),
                    collAssetInfo.decimals,
                );
                await setBalance(collAddr, senderAcc.address, amount);

                const reserveData = await pool.getReserveData(collAddr);
                collAssetId = reserveData.id;

                await aaveV3Supply(
                    proxy,
                    addrs[network].AAVE_MARKET,
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

                await aaveV3Borrow(
                    proxy,
                    addrs[network].AAVE_MARKET,
                    amountDebt,
                    senderAcc.address,
                    RATE_MODE,
                    debtAssetId,
                );

                await setBalance(debtAddr, senderAcc.address, Float2BN('0'));

                const triggerPrice = Float2BN(
                    `${((getLocalTokenPrice(collAssetInfo.symbol) * 0.8) / (10 ** 8)).toFixed(8)}`,
                    8,
                );

                ({ subId, strategySub } = await subAaveV3CloseBundle(
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

            it('... should call AaveV3 Close strategy', async () => {
                const collAssetBalanceBefore = await balanceOf(
                    compare(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                );

                const debtAssetBalanceBefore = await balanceOf(
                    compare(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                );

                if (isL2) {
                    await callAaveCloseToDebtL2Strategy(
                        strategyExecutorByBot,
                        subId,
                        collAssetInfo,
                        debtAssetInfo,
                    );
                } else {
                    await callAaveCloseToDebtStrategy(
                        strategyExecutorByBot,
                        subId,
                        strategySub,
                        collAssetInfo,
                        debtAssetInfo,
                    );
                }

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
        }
    });
};

const aaveV3FLCloseToDebtStrategyTest = async (numTestPairs) => {
    describe('AaveV3-FL-Close-to-Debt-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.05;
        const EXPECTED_MAX_INTEREST = 1e-6;
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
        let flAction;
        let bundleId;
        let snapshotId;
        let strategySub;
        let isL2 = false;

        before(async () => {
            console.log(`Network: ${network}`);

            await hre.ethers.provider.getBlockNumber()
                .then((e) => resetForkToBlock(Math.floor(e / BLOCKS_PER_6H) * BLOCKS_PER_6H));

            if (network === 'mainnet') {
                isL2 = false;
            }

            configure({
                chainId: chainIds[network],
                testMode: true,
            });

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            proxyAddr = proxy.address;

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore(isL2);

            await redeploy('AaveV3QuotePriceTrigger');
            await redeploy('DFSSell');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('AaveV3Withdraw');
            await redeploy('AaveV3Payback');
            await redeploy('GasFeeTaker');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            flAction = (await redeploy('FLAction')).address;

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToDebtBundle(proxy, false, !isL2);

            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should subscribe to AaveV3 FL Close strategy', async () => {
                await revertToSnapshot(snapshotId);
                snapshotId = await takeSnapshot();

                const amount = Float2BN(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, USD_COLL_OPEN),
                    collAssetInfo.decimals,
                );
                await setBalance(collAddr, senderAcc.address, amount);

                const reserveData = await pool.getReserveData(collAddr);
                collAssetId = reserveData.id;

                await aaveV3Supply(
                    proxy,
                    addrs[network].AAVE_MARKET,
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

                await aaveV3Borrow(
                    proxy,
                    addrs[network].AAVE_MARKET,
                    amountDebt,
                    senderAcc.address,
                    RATE_MODE,
                    debtAssetId,
                );

                await setBalance(debtAddr, senderAcc.address, Float2BN('0'));

                const triggerPrice = Float2BN(
                    `${((getLocalTokenPrice(collAssetInfo.symbol) * 0.8) / (10 ** 8)).toFixed(8)}`,
                    8,
                );

                ({ subId, strategySub } = await subAaveV3CloseBundle(
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

            it('... should call AaveV3 FL Close strategy', async () => {
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

                if (isL2) {
                    await callAaveFLCloseToDebtL2Strategy(
                        strategyExecutorByBot,
                        subId,
                        repayAmount,
                        debtAddr,
                        flAction,
                        collAssetInfo,
                        debtAssetInfo,
                    );
                } else {
                    await callAaveFLCloseToDebtStrategy(
                        strategyExecutorByBot,
                        subId,
                        strategySub,
                        repayAmount,
                        debtAddr,
                        flAction,
                        collAssetInfo,
                        debtAssetInfo,
                    );
                }
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
        }
    });
};

const aaveV3CloseToCollStrategyTest = async (numTestPairs) => {
    describe('AaveV3-Close-to-Coll-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.05;
        const EXPECTED_MAX_INTEREST = 1e-6;
        const EXPECTED_MAX_FEE = 5e-2; // gas + dfs fee
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
        let strategySub;
        let isL2 = true;

        before(async () => {
            console.log(`Network: ${network}`);

            await hre.ethers.provider.getBlockNumber()
                .then((e) => resetForkToBlock(Math.floor(e / BLOCKS_PER_6H) * BLOCKS_PER_6H));

            if (network === 'mainnet') {
                isL2 = false;
            }

            configure({
                chainId: chainIds[network],
                testMode: true,
            });

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            proxyAddr = proxy.address;

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore(isL2);

            await redeploy('AaveV3QuotePriceTrigger');
            await redeploy('DFSSell');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('AaveV3Withdraw');
            await redeploy('AaveV3Payback');
            await redeploy('GasFeeTaker');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToCollBundle(proxy, false, !isL2);

            const linkInfo = getAssetInfo('LINK', chainIds[network]);
            const amountLINK = Float2BN(
                fetchAmountinUSDPrice(
                    linkInfo.symbol,
                    USD_COLL_OPEN,
                ),
                linkInfo.decimals,
            );
            await setBalance(linkInfo.address, senderAcc.address, amountLINK);

            const reserveDataLINK = await pool.getReserveData(linkInfo.address);
            const linkAssetId = reserveDataLINK.id;

            await aaveV3Supply(
                proxy,
                addrs[network].AAVE_MARKET,
                amountLINK,
                linkInfo.address,
                linkAssetId,
                senderAcc.address,
            );

            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should subscribe to AaveV3 Close strategy', async () => {
                await revertToSnapshot(snapshotId);
                snapshotId = await takeSnapshot();

                const amount = Float2BN(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, USD_COLL_OPEN),
                    collAssetInfo.decimals,
                );
                await setBalance(collAddr, senderAcc.address, amount);

                const reserveData = await pool.getReserveData(collAddr);
                collAssetId = reserveData.id;

                await aaveV3Supply(
                    proxy,
                    addrs[network].AAVE_MARKET,
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

                await aaveV3Borrow(
                    proxy,
                    addrs[network].AAVE_MARKET,
                    amountDebt,
                    senderAcc.address,
                    RATE_MODE,
                    debtAssetId,
                );

                await setBalance(debtAddr, senderAcc.address, Float2BN('0'));

                const triggerPrice = Float2BN(
                    `${((getLocalTokenPrice(collAssetInfo.symbol) * 0.8) / (10 ** 8)).toFixed(8)}`,
                    8,
                );

                ({ subId, strategySub } = await subAaveV3CloseBundle(
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

            it('... should call AaveV3 Close strategy', async () => {
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

                if (isL2) {
                    await callAaveCloseToCollL2Strategy(
                        strategyExecutorByBot,
                        subId,
                        swapAmount,
                        collAssetInfo,
                        debtAssetInfo,
                    );
                } else {
                    await callAaveCloseToCollStrategy(
                        strategyExecutorByBot,
                        subId,
                        strategySub,
                        swapAmount,
                        collAssetInfo,
                        debtAssetInfo,
                        isL2,
                    );
                }

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
        }
    });
};

const aaveV3FLCloseToCollStrategyTest = async (numTestPairs) => {
    describe('AaveV3-FL-Close-to-Coll-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.03;
        const EXPECTED_MAX_INTEREST = 1e-6;
        const EXPECTED_MAX_FEE = 5e-2; // gas + dfsFee
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
        let flAction;
        let bundleId;
        let snapshotId;
        let strategySub;
        let isL2 = true;

        before(async () => {
            console.log(`Network: ${network}`);

            await hre.ethers.provider.getBlockNumber()
                .then((e) => resetForkToBlock(Math.floor(e / BLOCKS_PER_6H) * BLOCKS_PER_6H));

            if (network === 'mainnet') {
                isL2 = false;
            }

            configure({
                chainId: chainIds[network],
                testMode: true,
            });

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            proxyAddr = proxy.address;

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutor = await redeployCore(isL2);

            await redeploy('AaveV3QuotePriceTrigger');
            await redeploy('DFSSell');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('AaveV3Withdraw');
            await redeploy('AaveV3Payback');
            await redeploy('AaveV3Supply');
            await redeploy('AaveV3Borrow');
            await redeploy('GasFeeTaker');
            await redeploy('SendToken');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            flAction = (await redeploy('FLAction')).address;

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToCollBundle(proxy, false, !isL2);

            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should make a AaveV3 FL Close strategy and subscribe', async () => {
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

                await aaveV3Supply(
                    proxy,
                    addrs[network].AAVE_MARKET,
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

                await aaveV3Borrow(
                    proxy,
                    addrs[network].AAVE_MARKET,
                    amountDebt,
                    senderAcc.address,
                    RATE_MODE,
                    debtAssetId,
                );

                await setBalance(debtAddr, senderAcc.address, Float2BN('0'));

                const triggerPrice = Float2BN(
                    `${((getLocalTokenPrice(collAssetInfo.symbol) * 0.8) / (10 ** 8)).toFixed(8)}`,
                    8,
                );

                ({ subId, strategySub } = await subAaveV3CloseBundle(
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

            it('... should call AaveV3 FL Close strategy', async () => {
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

                if (isL2) {
                    await callAaveFLCloseToCollL2Strategy(
                        strategyExecutorByBot,
                        subId,
                        repayAmount,
                        debtAddr,
                        flAction,
                        swapAmount,
                        collAssetInfo,
                        debtAssetInfo,
                    );
                } else {
                    await callAaveFLCloseToCollStrategy(
                        strategyExecutorByBot,
                        subId,
                        strategySub,
                        repayAmount,
                        debtAddr,
                        flAction,
                        swapAmount,
                        collAssetInfo,
                        debtAssetInfo,
                    );
                }

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
        }
    });
};

const aaveV3StrategiesTest = async (numTestPairs) => {
    await aaveV3BoostStrategyTest(numTestPairs);
    await aaveV3RepayStrategyTest(numTestPairs);

    await aaveV3CloseToDebtStrategyTest(numTestPairs);
    await aaveV3FLCloseToDebtStrategyTest(numTestPairs);
    await aaveV3CloseToCollStrategyTest(numTestPairs);
    await aaveV3FLCloseToCollStrategyTest(numTestPairs);
};

module.exports = {
    aaveV3StrategiesTest,
    aaveV3RepayStrategyTest,
    aaveV3BoostStrategyTest,
    aaveV3CloseToDebtStrategyTest,
    aaveV3FLCloseToDebtStrategyTest,
    aaveV3CloseToCollStrategyTest,
    aaveV3FLCloseToCollStrategyTest,

    deployCloseToDebtBundle,
    deployCloseToCollBundle,
};
