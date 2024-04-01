const hre = require('hardhat');
const chai = require('chai');

const { expect } = require('chai');
chai.use(require('chai-as-promised'));

const { configure } = require('@defisaver/sdk');
const {
    assets,
    getAssetInfo,
    utils: { compare },
} = require('@defisaver/tokens');

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
} = require('../../../utils');

const {
    addBotCaller,
    createStrategy,
    createBundle,
    activateSub,
} = require('../../../utils-strategies');

const {
    createAaveV3CloseToCollWithMaximumGasPriceStrategy,
    createAaveV3FLCloseToCollWithMaximumGasPriceStrategy,
    createAaveV3CloseToDebtWithMaximumGasPriceStrategy,
    createAaveV3FLCloseToDebtWithMaximumGasPriceStrategy,
} = require('../../../strategies');

const {
    aaveV3Supply,
    aaveV3Borrow,
} = require('../../../actions');

const { RATIO_STATE_OVER } = require('../../../triggers');
const { subAaveV3CloseWithMaximumGasPriceBundle } = require('../../../strategy-subs');
const {
    callAaveCloseToCollWithMaximumGasPriceStrategy,
    callAaveFLCloseToCollWithMaximumGasPriceStrategy,
    callAaveCloseToDebtWithMaximumGasPriceStrategy,
    callAaveFLCloseToDebtWithMaximumGasPriceStrategy,
} = require('../../../strategy-calls');

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

const deployCloseToCollWithMaximumGasPriceBundle = async (proxy, isFork = false) => {
    await openStrategyAndBundleStorage(isFork);

    const closeStrategy = createAaveV3CloseToCollWithMaximumGasPriceStrategy();

    const flCloseStrategy = createAaveV3FLCloseToCollWithMaximumGasPriceStrategy();

    const aaveV3CloseToCollStrategyId = await createStrategy(
        proxy,
        ...closeStrategy,
        false,
    );
    const aaveV3FLCloseToCollStrategyId = await createStrategy(
        proxy,
        ...flCloseStrategy,
        false,
    );
    const aaveV3CloseToCollBundleId = await createBundle(
        proxy,
        [aaveV3CloseToCollStrategyId, aaveV3FLCloseToCollStrategyId],
    );

    return aaveV3CloseToCollBundleId;
};

const deployCloseToDebtWithMaximumGasPriceBundle = async (proxy, isFork = false) => {
    await openStrategyAndBundleStorage(isFork);

    const closeStrategy = createAaveV3CloseToDebtWithMaximumGasPriceStrategy();

    const flCloseStrategy = createAaveV3FLCloseToDebtWithMaximumGasPriceStrategy();

    const aaveV3CloseToDebtStrategyId = await createStrategy(
        proxy,
        ...closeStrategy,
        false,
    );
    const aaveV3FLCloseToDebtStrategyId = await createStrategy(
        proxy,
        ...flCloseStrategy,
        false,
    );
    const aaveV3CloseToCollBundleId = await createBundle(
        proxy,
        [aaveV3CloseToDebtStrategyId, aaveV3FLCloseToDebtStrategyId],
    );

    return aaveV3CloseToCollBundleId;
};
const aaveV3CloseToCollWithMaximumGasPriceStrategyTest = async (numTestPairs) => {
    describe('AaveV3-Close-to-Coll-With-Maximum-Gas-Price-Strategy-Test', function () {
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
        let sub;
        let collAssetId;
        let debtAssetId;
        let bundleId;
        let snapshotId;

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

            console.log({
                eoa: senderAcc.address,
                proxy: proxyAddr,
            });

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IPoolV3', poolAddress);

            strategyExecutor = await redeployCore();

            await redeploy('AaveV3QuotePriceTrigger');
            await redeploy('GasPriceTrigger');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('SendToken');
            await redeploy('DFSSell');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToCollWithMaximumGasPriceBundle(proxy);

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

            it('... should subscribe to AaveV3 Close With Maximum Gas Price strategy', async () => {
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

                ({
                    subId,
                    strategySub: sub,
                } = await subAaveV3CloseWithMaximumGasPriceBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    300,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 Close With Maximum Gas Price strategy', async () => {
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

                await callAaveCloseToCollWithMaximumGasPriceStrategy(
                    strategyExecutorByBot,
                    subId,
                    sub,
                    swapAmount,
                    collAssetInfo,
                    debtAssetInfo,
                );

                const {
                    collAssetBalance,
                    collAssetBalanceFloat,
                } = await balanceOf(
                    compare(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                )
                    .then((e) => Object({
                        collAssetBalance: e.sub(collAssetBalanceBefore),
                        collAssetBalanceFloat: BN2Float(
                            e.sub(collAssetBalanceBefore), collAssetInfo.decimals,
                        ),
                    }));

                const {
                    debtAssetBalance,
                    debtAssetBalanceFloat,
                } = await balanceOf(
                    compare(debtAddr, getAssetInfo('WETH', chainIds[network]).address, chainIds[network]) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                )
                    .then((e) => Object({
                        debtAssetBalance: e.sub(debtAssetBalanceBefore),
                        debtAssetBalanceFloat: BN2Float(
                            e.sub(debtAssetBalanceBefore), debtAssetInfo.decimals,
                        ),
                    }));

                console.log('-----sender coll/debt assets after close-----');
                console.log(`${collAssetInfo.symbol} balance: ${collAssetBalanceFloat} ($${collAssetBalanceFloat * getLocalTokenPrice(collAssetInfo.symbol)})`);
                console.log(`${debtAssetInfo.symbol} balance: ${debtAssetBalanceFloat} ($${debtAssetBalanceFloat * getLocalTokenPrice(debtAssetInfo.symbol)})`);
                console.log('---------------------------------------------');

                expect(await balanceOf(collAddr, proxyAddr))
                    .to
                    .be
                    .eq(Float2BN('0'));
                expect(await balanceOf(debtAddr, proxyAddr))
                    .to
                    .be
                    .eq(Float2BN('0'));
                expect(
                    collAssetBalance,
                )
                    .to
                    .be
                    .gt(
                        Float2BN(
                            fetchAmountinUSDPrice(
                                collAssetInfo.symbol,
                                (USD_COLL_OPEN - usdSwapAmount) * (1 - EXPECTED_MAX_FEE),
                            ),
                            collAssetInfo.decimals,
                        ),
                    );
                expect(debtAssetBalance)
                    .to
                    .be
                    .lte(
                        Float2BN(
                            fetchAmountinUSDPrice(
                                debtAssetInfo.symbol,
                                usdRepayAmount * ALLOWED_SLIPPAGE,
                            ),
                            debtAssetInfo.decimals,
                        ),
                    );
            });

            it('... should subscribe to AaveV3 Close With Maximum Gas Price strategy with small gasprice', async () => {
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

                ({
                    subId,
                    strategySub: sub,
                } = await subAaveV3CloseWithMaximumGasPriceBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    1,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 Close With Maximum Gas Price strategy and fail', async () => {
                const usdRepayAmount = USD_DEBT_OPEN * (1 + EXPECTED_MAX_INTEREST);
                const usdSwapAmount = usdRepayAmount * (1 + ALLOWED_SLIPPAGE);
                const swapAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        collAssetInfo.symbol,
                        usdSwapAmount,
                    ),
                    collAssetInfo.decimals,
                );

                let errMsg = 'Transaction reverted without a reason string';

                if (hre.config.isWalletSafe) {
                    errMsg = 'VM Exception while processing transaction: reverted with an unrecognized custom error (return data: 0xe540c1c8)';
                }

                await expect(callAaveCloseToCollWithMaximumGasPriceStrategy(
                    strategyExecutorByBot,
                    subId,
                    sub,
                    swapAmount,
                    collAssetInfo,
                    debtAssetInfo,
                )).to.be.rejectedWith(errMsg);
            });
        }
    });
};

const aaveV3FLCloseToCollWithMaximumGasPriceStrategyTest = async (numTestPairs) => {
    describe('AaveV3-FL-Close-to-Coll-With-Maximum-Gas-Price-Strategy-Test', function () {
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
        let sub;
        let collAssetId;
        let debtAssetId;
        let flActionAddr;
        let bundleId;
        let snapshotId;

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

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IPoolV3', poolAddress);

            strategyExecutor = await redeployCore();

            await redeploy('AaveV3QuotePriceTrigger');
            await redeploy('GasPriceTrigger');
            await redeploy('DFSSell');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('SendToken');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            flActionAddr = (await redeploy('FLAction')).address;

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToCollWithMaximumGasPriceBundle(proxy);

            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should make a AaveV3 FL Close With Maximum Gas Price strategy and subscribe', async () => {
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

                ({
                    subId,
                    strategySub: sub,
                } = await subAaveV3CloseWithMaximumGasPriceBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    300,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 FL Close With Maximum Gas Price strategy', async () => {
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

                await callAaveFLCloseToCollWithMaximumGasPriceStrategy(
                    strategyExecutorByBot,
                    subId,
                    sub,
                    repayAmount,
                    debtAddr,
                    flActionAddr,
                    swapAmount,
                    collAssetInfo,
                    debtAssetInfo,
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

            it('... should make a AaveV3 FL Close With Maximum Gas Price strategy and subscribe with small gas price', async () => {
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

                ({
                    subId,
                    strategySub: sub,
                } = await subAaveV3CloseWithMaximumGasPriceBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    1,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 FL Close With Maximum Gas Price strategy and fail', async () => {
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

                let errMsg = 'Transaction reverted without a reason string';

                if (hre.config.isWalletSafe) {
                    errMsg = 'VM Exception while processing transaction: reverted with an unrecognized custom error (return data: 0xe540c1c8)';
                }

                await expect(callAaveFLCloseToCollWithMaximumGasPriceStrategy(
                    strategyExecutorByBot,
                    subId,
                    sub,
                    repayAmount,
                    debtAddr,
                    flActionAddr,
                    swapAmount,
                    collAssetInfo,
                    debtAssetInfo,
                )).to.be.rejectedWith(errMsg);
            });
        }
    });
};

const aaveV3CloseToDebtWithMaximumGasPriceStrategyTest = async (numTestPairs) => {
    describe('AaveV3-Close-to-Debt-With-Maximum-Gas-Price-Strategy-Test', function () {
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
        let sub;
        let collAssetId;
        let debtAssetId;
        let bundleId;
        let snapshotId;

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

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IPoolV3', poolAddress);

            strategyExecutor = await redeployCore();

            await redeploy('AaveV3QuotePriceTrigger');
            await redeploy('GasPriceTrigger');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('SendToken');
            await redeploy('DFSSell');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToDebtWithMaximumGasPriceBundle(proxy);

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

            it('... should subscribe to AaveV3 Close With Maximum Gas Price strategy', async () => {
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

                ({ subId, strategySub: sub } = await subAaveV3CloseWithMaximumGasPriceBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    300,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 Close with maximum gas price strategy', async () => {
                const collAssetBalanceBefore = await balanceOf(
                    compare(collAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : collAddr,
                    senderAcc.address,
                );

                const debtAssetBalanceBefore = await balanceOf(
                    compare(debtAddr, getAssetInfo('WETH', chainIds[network]).address) ? ETH_ADDR : debtAddr,
                    senderAcc.address,
                );

                await callAaveCloseToDebtWithMaximumGasPriceStrategy(
                    strategyExecutorByBot,
                    subId,
                    sub,
                    collAssetInfo,
                    debtAssetInfo,
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

            it('... should subscribe to AaveV3 Close With Maximum Gas Price strategy with small gas price', async () => {
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

                ({ subId, strategySub: sub } = await subAaveV3CloseWithMaximumGasPriceBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    1,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 Close with maximum gas price strategy and fail', async () => {
                let errMsg = 'Transaction reverted without a reason string';

                if (hre.config.isWalletSafe) {
                    errMsg = 'VM Exception while processing transaction: reverted with an unrecognized custom error (return data: 0xe540c1c8)';
                }

                await expect(callAaveCloseToDebtWithMaximumGasPriceStrategy(
                    strategyExecutorByBot,
                    subId,
                    sub,
                    collAssetInfo,
                    debtAssetInfo,
                )).to.be.rejectedWith(errMsg);
            });
        }
    });
};

const aaveV3FLCloseToDebtWithMaximumGasPriceStrategyTest = async (numTestPairs) => {
    describe('AaveV3-FL-Close-to-Debt-With-Maximum-Gas-Price-Strategy-Test', function () {
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
        let sub;
        let collAssetId;
        let debtAssetId;
        let flActionAddr;
        let bundleId;
        let snapshotId;

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

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IPoolV3', poolAddress);

            strategyExecutor = await redeployCore();

            await redeploy('AaveV3QuotePriceTrigger');
            await redeploy('GasPriceTrigger');
            await redeploy('SendTokenAndUnwrap');
            await redeploy('SendToken');
            await redeploy('DFSSell');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            flActionAddr = (await redeploy('FLAction')).address;

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            bundleId = await deployCloseToDebtWithMaximumGasPriceBundle(proxy);

            snapshotId = await takeSnapshot();
        });

        for (let i = 0; i < numTestPairs; ++i) {
            const collAssetInfo = assets.find((c) => c.symbol === testPairs[i].collAsset);
            const debtAssetInfo = assets.find((c) => c.symbol === testPairs[i].debtAsset);
            const collAddr = collAssetInfo.addresses[chainIds[network]];
            const debtAddr = debtAssetInfo.addresses[chainIds[network]];

            it('... should subscribe to AaveV3 FL Close With Maximum Gas Price strategy', async () => {
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

                ({
                    subId,
                    strategySub: sub,
                } = await subAaveV3CloseWithMaximumGasPriceBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    300,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 FL Close With Maximum Gas Price strategy', async () => {
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

                await callAaveFLCloseToDebtWithMaximumGasPriceStrategy(
                    strategyExecutorByBot,
                    subId,
                    sub,
                    repayAmount,
                    debtAddr,
                    flActionAddr,
                    collAssetInfo,
                    debtAssetInfo,
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

            it('... should subscribe to AaveV3 FL Close With Maximum Gas Price strategy with small gas price', async () => {
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

                ({
                    subId,
                    strategySub: sub,
                } = await subAaveV3CloseWithMaximumGasPriceBundle(
                    proxy,
                    bundleId,
                    collAddr,
                    nullAddress,
                    triggerPrice,
                    RATIO_STATE_OVER,
                    1,
                    collAddr,
                    collAssetId,
                    debtAddr,
                    debtAssetId,
                ));

                await activateSub(proxy, subId);
            });

            it('... should call AaveV3 FL Close With Maximum Gas Price strategy and fail', async () => {
                const repayAmount = Float2BN(
                    fetchAmountinUSDPrice(
                        debtAssetInfo.symbol,
                        USD_DEBT_OPEN * (1 + EXPECTED_MAX_INTEREST),
                    ),
                    debtAssetInfo.decimals,
                );

                let errMsg = 'Transaction reverted without a reason string';

                if (hre.config.isWalletSafe) {
                    errMsg = 'VM Exception while processing transaction: reverted with an unrecognized custom error (return data: 0xe540c1c8)';
                }

                await expect(callAaveFLCloseToDebtWithMaximumGasPriceStrategy(
                    strategyExecutorByBot,
                    subId,
                    sub,
                    repayAmount,
                    debtAddr,
                    flActionAddr,
                    collAssetInfo,
                    debtAssetInfo,
                )).to.be.rejectedWith(errMsg);
            });
        }
    });
};

module.exports = {
    deployCloseToCollWithMaximumGasPriceBundle,
    deployCloseToDebtWithMaximumGasPriceBundle,
    aaveV3CloseToCollWithMaximumGasPriceStrategyTest,
    aaveV3FLCloseToCollWithMaximumGasPriceStrategyTest,
    aaveV3CloseToDebtWithMaximumGasPriceStrategyTest,
    aaveV3FLCloseToDebtWithMaximumGasPriceStrategyTest,
};
