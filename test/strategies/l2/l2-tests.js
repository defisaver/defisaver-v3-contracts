const hre = require('hardhat');
const { expect } = require('chai');

const { configure } = require('@defisaver/sdk');
const { assets, getAssetInfo } = require('@defisaver/tokens');

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
    getAddrFromRegistry,
    ETH_ADDR,
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

const deployCloseToDebtBundle = async (proxy, isFork = undefined) => {
    await openStrategyAndBundleStorage(isFork);
    const aaveV3CloseToDebtL2StrategyId = await createStrategy(
        proxy,
        ...createAaveV3CloseToDebtL2Strategy(),
        false,
    );
    const aaveV3FLCloseToDebtL2StrategyId = await createStrategy(
        proxy,
        ...createAaveV3FLCloseToDebtL2Strategy(),
        false,
    );
    const aaveV3CloseToDebtBundleId = await createBundle(
        proxy,
        [aaveV3CloseToDebtL2StrategyId, aaveV3FLCloseToDebtL2StrategyId],
    );

    return aaveV3CloseToDebtBundleId;
};

const deployCloseToCollBundle = async (proxy, isFork = undefined) => {
    await openStrategyAndBundleStorage(isFork);
    const aaveV3CloseToCollL2StrategyId = await createStrategy(
        proxy,
        ...createAaveV3CloseToCollL2Strategy(),
        false,
    );
    const aaveV3FLCloseToCollL2StrategyId = await createStrategy(
        proxy,
        ...createAaveV3FLCloseToCollL2Strategy(),
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

const compareAddr = (addrA, addrB) => addrA.toLowerCase() === addrB.toLowerCase();

const aaveV3RepayL2StrategyTest = async (numTestPairs) => {
    describe('AaveV3-Repay-L2-Strategy-Test', function () {
        this.timeout(1200000);

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutorL2;
        let pool;
        let aaveView;
        let subIds;
        let collAssetId;
        let debtAssetId;
        let flAaveV3Addr;
        let flAaveV3;

        before(async () => {
            console.log(`Network: ${network}`);

            await resetForkToBlock();

            configure({
                chainId: chainIds[network],
                testMode: true,
            });

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            console.log('proxyAddr: ', proxyAddr);

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutorL2 = await redeployCore(true);

            await redeploy('BotAuth');
            await redeploy('AaveV3RatioTrigger');
            await redeploy('GasFeeTakerL2');
            await redeploy('DFSSell');
            await redeploy('AaveV3Payback');
            await redeploy('AaveV3Withdraw');
            await redeploy('AaveSubProxy');
            await redeploy('AaveV3RatioCheck');

            flAaveV3Addr = (await getAddrFromRegistry('FLAaveV3')).toString();
            flAaveV3 = await hre.ethers.getContractAt('FLAaveV3', flAaveV3Addr);

            aaveView = await redeploy('AaveV3View');

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should make a AaveV3 L2 Repay bundle and subscribe', async () => {
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

                const targetRatio = hre.ethers.utils.parseUnits('1.8', '18');
                const ratioUnder = hre.ethers.utils.parseUnits('1.7', '18');

                subIds = await subAaveV3L2AutomationStrategy(
                    proxy,
                    ratioUnder.toHexString().slice(2),
                    '0',
                    '0',
                    targetRatio.toHexString().slice(2),
                    false,
                );
            });

            it('... should call AaveV3 L2 Repay strategy', async () => {
                const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
                console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

                const repayAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].collAsset, '2000'),
                    collAssetInfo.decimals,
                );

                await callAaveV3RepayL2Strategy(
                    botAcc,
                    strategyExecutorL2,
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

            it('... should call AaveV3 L2 With FL Repay strategy', async () => {
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
                    strategyExecutorL2,
                    subIds.firstSub,
                    collAssetId,
                    collAddr,
                    debtAddr,
                    debtAssetId,
                    repayAmount,
                    flAaveV3.address,
                    1,
                );

                const ratioAfter = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
                console.log(`Aave position ratio: ${ratioAfter / 1e16}%`);
                expect(ratioAfter).to.be.gt(ratioBefore);
            });
        }
    });
};

const aaveV3BoostL2StrategyTest = async (numTestPairs) => {
    describe('AaveV3-Boost-L2-Strategy-Test', function () {
        this.timeout(1200000);

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutorL2;
        let pool;
        let aaveView;
        let subIds;
        let collAssetId;
        let debtAssetId;
        let flAaveV3Addr;
        let flAaveV3;

        before(async () => {
            console.log(`Network: ${network}`);

            await resetForkToBlock();

            configure({
                chainId: chainIds[network],
                testMode: true,
            });

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            console.log('proxyAddr: ', proxyAddr);

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutorL2 = await redeployCore(true);

            await redeploy('BotAuth');
            await redeploy('AaveV3RatioTrigger');
            await redeploy('GasFeeTakerL2');
            await redeploy('DFSSell');
            await redeploy('AaveV3Supply');
            await redeploy('AaveV3Borrow');
            await redeploy('AaveSubProxy');
            await redeploy('AaveV3RatioCheck');

            flAaveV3Addr = (await getAddrFromRegistry('FLAaveV3')).toString();
            flAaveV3 = await hre.ethers.getContractAt('FLAaveV3', flAaveV3Addr);

            aaveView = await redeploy('AaveV3View');

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should make a AaveV3 L2 Boost bundle and subscribe', async () => {
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

                // await deployBundles(proxy);

                const targetRatio = hre.ethers.utils.parseUnits('1.5', '18');
                const ratioOver = hre.ethers.utils.parseUnits('1.7', '18');

                subIds = await subAaveV3L2AutomationStrategy(
                    proxy,
                    '0',
                    ratioOver.toHexString().slice(2),
                    targetRatio.toHexString().slice(2),
                    '0',
                    true,
                );
            });

            it('... should call AaveV3 L2 Boost strategy', async () => {
                const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
                console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

                const boostAmount = hre.ethers.utils.parseUnits(
                    fetchAmountinUSDPrice(testPairs[i].debtAsset, '1000'),
                    debtAssetInfo.decimals,
                );

                await callAaveV3BoostL2Strategy(
                    botAcc,
                    strategyExecutorL2,
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

            it('... should call AaveV3 L2 With FL Boost strategy', async () => {
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
                        strategyExecutorL2,
                        subIds.secondSub,
                        collAddr,
                        debtAddr,
                        collAssetId,
                        debtAssetId,
                        boostAmount,
                        flAaveV3.address,
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

const aaveV3CloseToDebtL2StrategyTest = async (numTestPairs) => {
    describe('AaveV3-Close-to-Debt-L2-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.05;
        const EXPECTED_MAX_INTEREST = 1e-6;
        const PARTIAL_CLOSE = 0.5;
        const RATE_MODE = 2;

        let strategyExecutorByBot;
        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutorL2;
        let pool;
        let subId;
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
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutorL2 = await redeployCore(true);

            await redeploy('AaveV3QuotePriceTrigger');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutorL2.connect(botAcc);

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

            it('... should subscribe to AaveV3 L2 Close strategy', async () => {
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
                    `${(getLocalTokenPrice(collAssetInfo.symbol) * 0.8).toFixed(8)}`,
                    8,
                );

                subId = await subAaveV3CloseBundle(
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
                );

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 L2 Close strategy', async () => {
                snapshotId4partial = await takeSnapshot();

                const collAssetBalanceBefore = await balanceOf(
                    compareAddr(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                );

                const debtAssetBalanceBefore = await balanceOf(
                    compareAddr(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                );

                await callAaveCloseToDebtL2Strategy(
                    strategyExecutorByBot,
                    subId,
                    collAssetInfo,
                    debtAssetInfo,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    compareAddr(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e.sub(collAssetBalanceBefore),
                    collAssetBalanceFloat: BN2Float(
                        e.sub(collAssetBalanceBefore), collAssetInfo.decimals,
                    ),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    compareAddr(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
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

                await callAaveCloseToDebtL2Strategy(
                    strategyExecutorByBot,
                    subId,
                    collAssetInfo,
                    debtAssetInfo,
                    { withdrawAmount, repayAmount },
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

const aaveV3FLCloseToDebtL2StrategyTest = async (numTestPairs) => {
    describe('AaveV3-FL-Close-to-Debt-L2-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.05;
        const EXPECTED_MAX_INTEREST = 1e-6;
        const PARTIAL_CLOSE = 0.5;
        const RATE_MODE = 2;

        let strategyExecutorByBot;
        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutorL2;
        let pool;
        let subId;
        let collAssetId;
        let debtAssetId;
        let flAaveV3;
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
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutorL2 = await redeployCore(true);

            await redeploy('AaveV3QuotePriceTrigger');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            flAaveV3 = await getAddrFromRegistry('FLAaveV3');

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutorL2.connect(botAcc);

            bundleId = await deployCloseToDebtBundle(proxy);

            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should subscribe to AaveV3 L2 FL Close strategy', async () => {
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
                    `${(getLocalTokenPrice(collAssetInfo.symbol) * 0.8).toFixed(8)}`,
                    8,
                );

                subId = await subAaveV3CloseBundle(
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
                );

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 L2 FL Close strategy', async () => {
                snapshotId4partial = await takeSnapshot();

                const repayAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        debtAssetInfo.symbol,
                        USD_DEBT_OPEN * (1 + EXPECTED_MAX_INTEREST),
                    ),
                    debtAssetInfo.decimals,
                );

                const collAssetBalanceBefore = await balanceOf(
                    compareAddr(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                );

                const debtAssetBalanceBefore = await balanceOf(
                    compareAddr(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                );

                await callAaveFLCloseToDebtL2Strategy(
                    strategyExecutorByBot,
                    subId,
                    repayAmount,
                    debtAddr,
                    flAaveV3,
                    collAssetInfo,
                    debtAssetInfo,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    compareAddr(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e.sub(collAssetBalanceBefore),
                    collAssetBalanceFloat: BN2Float(
                        e.sub(collAssetBalanceBefore), collAssetInfo.decimals,
                    ),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    compareAddr(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
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

                await callAaveFLCloseToDebtL2Strategy(
                    strategyExecutorByBot,
                    subId,
                    repayAmount,
                    debtAddr,
                    flAaveV3,
                    collAssetInfo,
                    debtAssetInfo,
                    withdrawAmount,
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

const aaveV3CloseToCollL2StrategyTest = async (numTestPairs) => {
    describe('AaveV3-Close-to-Coll-L2-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.05;
        const PARTIAL_CLOSE = 0.5;
        const EXPECTED_MAX_INTEREST = 1e-6;
        const EXPECTED_MAX_FEE = 1e-2; // gas + dfs fee
        const RATE_MODE = 2;

        let strategyExecutorByBot;
        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutorL2;
        let pool;
        let subId;
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
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutorL2 = await redeployCore(true);

            await redeploy('AaveV3QuotePriceTrigger');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutorL2.connect(botAcc);

            bundleId = await deployCloseToCollBundle(proxy);

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

            it('... should subscribe to AaveV3 L2 Close strategy', async () => {
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
                    `${(getLocalTokenPrice(collAssetInfo.symbol) * 0.8).toFixed(8)}`,
                    8,
                );

                subId = await subAaveV3CloseBundle(
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
                );

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 L2 Close strategy', async () => {
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
                    compareAddr(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                );

                const debtAssetBalanceBefore = await balanceOf(
                    compareAddr(debtAddr, getAssetInfo('WETH', chainIds[network]).address, chainIds[network]) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                );

                await callAaveCloseToCollL2Strategy(
                    strategyExecutorByBot,
                    subId,
                    swapAmount,
                    collAssetInfo,
                    debtAssetInfo,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    compareAddr(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e.sub(collAssetBalanceBefore),
                    collAssetBalanceFloat: BN2Float(
                        e.sub(collAssetBalanceBefore), collAssetInfo.decimals,
                    ),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    compareAddr(debtAddr, getAssetInfo('WETH', chainIds[network]).address, chainIds[network]) ? ETH_ADDR : debtAddr,
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

                await callAaveCloseToCollL2Strategy(
                    strategyExecutorByBot,
                    subId,
                    0, // will be maxuint
                    collAssetInfo,
                    debtAssetInfo,
                    { withdrawAmount, repayAmount },
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

const aaveV3FLCloseToCollL2StrategyTest = async (numTestPairs) => {
    describe('AaveV3-FL-Close-to-Coll-L2-Strategy-Test', function () {
        this.timeout(1200000);

        const USD_COLL_OPEN = '25000';
        const USD_DEBT_OPEN = '10000';
        const ALLOWED_SLIPPAGE = 0.03;
        const EXPECTED_MAX_INTEREST = 1e-6;
        const EXPECTED_MAX_FEE = 1e-2; // gas + dfsFee
        const PARTIAL_CLOSE = 0.5;
        const RATE_MODE = 2;

        let strategyExecutorByBot;
        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutorL2;
        let pool;
        let subId;
        let collAssetId;
        let debtAssetId;
        let flAaveV3;
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
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            console.log({ eoa: senderAcc.address, proxy: proxyAddr });

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutorL2 = await redeployCore(true);

            await redeploy('AaveV3QuotePriceTrigger');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            flAaveV3 = await getAddrFromRegistry('FLAaveV3');

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutorL2.connect(botAcc);

            bundleId = await deployCloseToCollBundle(proxy);

            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should make a AaveV3 L2 FL Close strategy and subscribe', async () => {
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
                    `${(getLocalTokenPrice(collAssetInfo.symbol) * 0.8).toFixed(8)}`,
                    8,
                );

                subId = await subAaveV3CloseBundle(
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
                );

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 L2 FL Close strategy', async () => {
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
                    compareAddr(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                );

                const debtAssetBalanceBefore = await balanceOf(
                    compareAddr(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                );

                await callAaveFLCloseToCollL2Strategy(
                    strategyExecutorByBot,
                    subId,
                    repayAmount,
                    debtAddr,
                    flAaveV3,
                    swapAmount,
                    collAssetInfo,
                    debtAssetInfo,
                );

                const { collAssetBalance, collAssetBalanceFloat } = await balanceOf(
                    compareAddr(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                ).then((e) => Object({
                    collAssetBalance: e.sub(collAssetBalanceBefore),
                    collAssetBalanceFloat: BN2Float(
                        e.sub(collAssetBalanceBefore), collAssetInfo.decimals,
                    ),
                }));

                const { debtAssetBalance, debtAssetBalanceFloat } = await balanceOf(
                    compareAddr(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
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

                await callAaveFLCloseToCollL2Strategy(
                    strategyExecutorByBot,
                    subId,
                    repayAmount,
                    debtAddr,
                    flAaveV3,
                    0, // will be maxuint
                    collAssetInfo,
                    debtAssetInfo,
                    withdrawAmount,
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

const l2StrategiesTest = async (numTestPairs) => {
    await aaveV3BoostL2StrategyTest(numTestPairs);
    await aaveV3RepayL2StrategyTest(numTestPairs);

    await aaveV3CloseToDebtL2StrategyTest(numTestPairs);
    await aaveV3FLCloseToDebtL2StrategyTest(numTestPairs);
    await aaveV3CloseToCollL2StrategyTest(numTestPairs);
    await aaveV3FLCloseToCollL2StrategyTest(numTestPairs);
};

module.exports = {
    l2StrategiesTest,
    aaveV3RepayL2StrategyTest,
    aaveV3BoostL2StrategyTest,
    aaveV3CloseToDebtL2StrategyTest,
    aaveV3FLCloseToDebtL2StrategyTest,
    aaveV3CloseToCollL2StrategyTest,
    aaveV3FLCloseToCollL2StrategyTest,

    deployCloseToDebtBundle,
    deployCloseToCollBundle,
};
