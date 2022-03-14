const { expect } = require('chai');
const hre = require('hardhat');

const {
    balanceOf,
    getProxy,
    redeploy,
    approve,
    ETH_ADDR,
    WETH_ADDRESS,
    setBalance,
    Float2BN,
    resetForkToBlock,
    timeTravel,
    BN2Float,
    STETH_ADDRESS,
} = require('../utils');

const {
    curveDeposit,
    curveWithdraw,
    curveGaugeDeposit,
    curveGaugeWithdraw,
    curveClaimFees,
    curveStethPoolDeposit,
    curveStethPoolWithdraw,
} = require('../actions.js');

const poolData = require('./poolData');

const curveDepositTest = async (testLength) => {
    describe('Curve-Deposit', function () {
        this.timeout(1000000);
        const amount = '1000';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;

        before(async () => {
            await resetForkToBlock(13000000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await redeploy('CurveDeposit');
            await redeploy('CurveView');
        });

        Object.keys(poolData).slice(0, testLength).map(async (poolName) => {
            it(`... should deposit [coins] via [swapContract] ${poolName}`, async () => {
                const coins = poolData[poolName].coins;
                const decimals = poolData[poolName].decimals;
                const amounts = decimals.map((e) => Float2BN(amount, e));

                await Promise.all(coins.map(async (c, i) => {
                    let coinToApprove = c;
                    if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                    await setBalance(coinToApprove, senderAddr, amounts[i]);
                    await approve(coinToApprove, proxyAddr);
                }));

                const tokensBefore = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                await curveDeposit(proxy, senderAddr, senderAddr, poolData[poolName].swapAddr, poolData[poolName].lpTokenAddr, '0', amounts, coins, false);
                const tokensAfter = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                expect(tokensAfter.sub(tokensBefore)).to.be.gt('0');
            });
            if (poolData[poolName].useUnderlying) {
                it(`... should deposit [underlyingCoins] via [swapContract] ${poolName}`, async () => {
                    const underlyingCoins = poolData[poolName].underlyingCoins;
                    const decimals = poolData[poolName].underlyingDecimals;
                    const amounts = decimals.map((e) => Float2BN(amount, e));

                    await Promise.all(underlyingCoins.map(async (c, i) => {
                        let coinToApprove = c;
                        if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                        await setBalance(coinToApprove, senderAddr, amounts[i]);
                        await approve(coinToApprove, proxyAddr);
                    }));

                    // eslint-disable-next-line max-len
                    const tokensBefore = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                    await curveDeposit(proxy, senderAddr, senderAddr, poolData[poolName].swapAddr, poolData[poolName].lpTokenAddr, '0', amounts, underlyingCoins, true);
                    const tokensAfter = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                    expect(tokensAfter.sub(tokensBefore)).to.be.gt('0');
                });
            }
            if (poolData[poolName].depositAddr == null) return;
            it(`... should deposit [underlyingCoins] via [depositContract] ${poolName}`, async () => {
                const underlyingCoins = poolData[poolName].underlyingCoins;
                const decimals = poolData[poolName].underlyingDecimals;
                const amounts = decimals.map((e) => Float2BN(amount, e));

                await Promise.all(underlyingCoins.map(async (c, i) => {
                    let coinToApprove = c;
                    if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                    await setBalance(coinToApprove, senderAddr, amounts[i]);
                    await approve(coinToApprove, proxyAddr);
                }));

                const tokensBefore = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                await curveDeposit(proxy, senderAddr, senderAddr, poolData[poolName].depositAddr, poolData[poolName].lpTokenAddr, '0', amounts, underlyingCoins, false);
                const tokensAfter = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                expect(tokensAfter.sub(tokensBefore)).to.be.gt('0');
            });
        });
    });
};

const curveWithdrawTest = async (testLength) => {
    describe('Curve-Withdraw', function () {
        this.timeout(1000000);
        const amount = '1000';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;

        before(async () => {
            await resetForkToBlock(13000000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await redeploy('CurveDeposit');
            await redeploy('CurveWithdraw');
            await redeploy('CurveView');
        });

        Object.keys(poolData).slice(0, testLength).forEach(async (poolName) => {
            it(`... should deposit and then withdraw [coins] via [swapContract] ${poolName}`, async () => {
                const coins = poolData[poolName].coins;
                const decimals = poolData[poolName].decimals;
                const amounts = decimals.map((e) => Float2BN(amount, e));

                await Promise.all(coins.map(async (c, i) => {
                    let coinToApprove = c;
                    if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                    await setBalance(coinToApprove, senderAddr, amounts[i]);
                    await approve(coinToApprove, proxyAddr);
                }));

                const tokensBefore = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                await curveDeposit(proxy, senderAddr, senderAddr, poolData[poolName].swapAddr, poolData[poolName].lpTokenAddr, '0', amounts, coins, false);
                const tokensAfter = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                const minted = tokensAfter.sub(tokensBefore);

                expect(minted).to.be.gt('0');

                // eslint-disable-next-line max-len
                const balancesBefore = await Promise.all(coins.map(async (c) => balanceOf(c === ETH_ADDR ? WETH_ADDRESS : c, senderAddr)));

                await approve(poolData[poolName].lpTokenAddr, proxyAddr);

                await curveWithdraw(
                    proxy,
                    senderAddr,
                    senderAddr,
                    poolData[poolName].swapAddr,
                    poolData[poolName].lpTokenAddr,
                    minted, amounts.map(() => '0'),
                    coins,
                    false,
                    false,
                );
                // eslint-disable-next-line max-len
                const balancesAfter = await Promise.all(coins.map(async (c) => balanceOf(c === ETH_ADDR ? WETH_ADDRESS : c, senderAddr)));

                const nominalBalanceDelta = balancesAfter.reduce((prev, e) => prev.add(e)).sub(
                    balancesBefore.reduce((prev, e) => prev.add(e)),
                );

                expect(nominalBalanceDelta).to.be.gt('0');
            });
            if (poolData[poolName].useUnderlying) {
                it(`... should deposit and then withdraw [underlyingCoins] via [swapContract] ${poolName}`, async () => {
                    const underlyingCoins = poolData[poolName].underlyingCoins;
                    const decimals = poolData[poolName].underlyingDecimals;
                    const amounts = decimals.map((e) => Float2BN(amount, e));

                    await Promise.all(underlyingCoins.map(async (c, i) => {
                        let coinToApprove = c;
                        if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                        await setBalance(coinToApprove, senderAddr, amounts[i]);
                        await approve(coinToApprove, proxyAddr);
                    }));

                    // eslint-disable-next-line max-len
                    const tokensBefore = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                    await curveDeposit(proxy, senderAddr, senderAddr, poolData[poolName].swapAddr, poolData[poolName].lpTokenAddr, '0', amounts, underlyingCoins, true);
                    const tokensAfter = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                    const minted = tokensAfter.sub(tokensBefore);
                    expect(minted).to.be.gt('0');

                    // eslint-disable-next-line max-len
                    const balancesBefore = await Promise.all(underlyingCoins.map(async (c) => balanceOf(c, senderAddr)));

                    await approve(poolData[poolName].lpTokenAddr, proxyAddr);
                    await curveWithdraw(
                        proxy,
                        senderAddr,
                        senderAddr,
                        poolData[poolName].swapAddr,
                        poolData[poolName].lpTokenAddr,
                        minted,
                        amounts.map(() => '0'),
                        underlyingCoins,
                        false,
                        true,
                    );

                    // eslint-disable-next-line max-len
                    const balancesAfter = await Promise.all(underlyingCoins.map(async (c) => balanceOf(c, senderAddr)));

                    const nominalBalanceDelta = balancesAfter.reduce((prev, e) => prev.add(e)).sub(
                        balancesBefore.reduce((prev, e) => prev.add(e)),
                    );

                    expect(nominalBalanceDelta).to.be.gt('0');
                });
            }
            if (poolData[poolName].depositAddr == null) return;
            it(`... should deposit and then withdraw [underlyingCoins] via [depositContract] ${poolName}`, async () => {
                const underlyingCoins = poolData[poolName].underlyingCoins;
                const decimals = poolData[poolName].underlyingDecimals;
                const amounts = decimals.map((e) => Float2BN(amount, e));

                await Promise.all(underlyingCoins.map(async (c, i) => {
                    let coinToApprove = c;
                    if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                    await setBalance(coinToApprove, senderAddr, amounts[i]);
                    await approve(coinToApprove, proxyAddr);
                }));

                const tokensBefore = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                await curveDeposit(proxy, senderAddr, senderAddr, poolData[poolName].depositAddr, poolData[poolName].lpTokenAddr, '0', amounts, underlyingCoins, false, false);
                const tokensAfter = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                const minted = tokensAfter.sub(tokensBefore);
                expect(minted).to.be.gt('0');

                // eslint-disable-next-line max-len
                const balancesBefore = await Promise.all(underlyingCoins.map(async (c) => balanceOf(c, senderAddr)));

                await approve(poolData[poolName].lpTokenAddr, proxyAddr);
                await curveWithdraw(
                    proxy,
                    senderAddr,
                    senderAddr,
                    poolData[poolName].depositAddr,
                    poolData[poolName].lpTokenAddr,
                    minted,
                    amounts.map(() => '0'),
                    underlyingCoins,
                    false,
                    false,
                );

                // eslint-disable-next-line max-len
                const balancesAfter = await Promise.all(underlyingCoins.map(async (c) => balanceOf(c, senderAddr)));

                const nominalBalanceDelta = balancesAfter.reduce((prev, e) => prev.add(e)).sub(
                    balancesBefore.reduce((prev, e) => prev.add(e)),
                );

                expect(nominalBalanceDelta).to.be.gt('0');
            });
        });
    });
};

const curveWithdrawExactTest = async (testLength) => {
    describe('Curve-Withdraw-Exact', function () {
        this.timeout(1000000);
        const amount = '1000';
        const withdrawAmount = '900';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;

        before(async () => {
            await resetForkToBlock(13000000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await redeploy('CurveDeposit');
            await redeploy('CurveWithdraw');
            await redeploy('CurveView');
        });

        Object.keys(poolData).slice(0, testLength).forEach(async (poolName) => {
            it(`... should deposit and then withdraw [coins] via [swapContract] ${poolName}`, async () => {
                const coins = poolData[poolName].coins;
                const decimals = poolData[poolName].decimals;
                const amounts = decimals.map((e) => Float2BN(amount, e));

                await Promise.all(coins.map(async (c, i) => {
                    let coinToApprove = c;
                    if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                    await setBalance(coinToApprove, senderAddr, amounts[i]);
                    await approve(coinToApprove, proxyAddr);
                }));

                const tokensBefore = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                await curveDeposit(proxy, senderAddr, senderAddr, poolData[poolName].swapAddr, poolData[poolName].lpTokenAddr, '0', amounts, coins, false);
                const tokensAfter = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                const minted = tokensAfter.sub(tokensBefore);
                expect(minted).to.be.gt('0');

                // eslint-disable-next-line max-len
                const balancesBefore = await Promise.all(coins.map(async (c) => balanceOf(c === ETH_ADDR ? WETH_ADDRESS : c, senderAddr)));

                await approve(poolData[poolName].lpTokenAddr, proxyAddr);
                await curveWithdraw(
                    proxy,
                    senderAddr,
                    senderAddr,
                    poolData[poolName].swapAddr,
                    poolData[poolName].lpTokenAddr,
                    minted,
                    amounts.map(() => withdrawAmount),
                    coins,
                    true,
                    false,
                );

                // eslint-disable-next-line max-len
                const balancesAfter = await Promise.all(coins.map(async (c) => balanceOf(c === ETH_ADDR ? WETH_ADDRESS : c, senderAddr)));

                const nominalBalanceDelta = balancesAfter.reduce((prev, e) => prev.add(e)).sub(
                    balancesBefore.reduce((prev, e) => prev.add(e)),
                );

                expect(nominalBalanceDelta).to.be.gt('0');
            });
            if (poolData[poolName].useUnderlying) {
                it(`... should deposit and then withdraw [underlyingCoins] via [swapContract] ${poolName}`, async () => {
                    const underlyingCoins = poolData[poolName].underlyingCoins;
                    const decimals = poolData[poolName].underlyingDecimals;
                    const amounts = decimals.map((e) => Float2BN(amount, e));

                    await Promise.all(underlyingCoins.map(async (c, i) => {
                        let coinToApprove = c;
                        if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                        await setBalance(coinToApprove, senderAddr, amounts[i]);
                        await approve(coinToApprove, proxyAddr);
                    }));

                    // eslint-disable-next-line max-len
                    const tokensBefore = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                    await curveDeposit(proxy, senderAddr, senderAddr, poolData[poolName].swapAddr, poolData[poolName].lpTokenAddr, '0', amounts, underlyingCoins, true);
                    const tokensAfter = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                    const minted = tokensAfter.sub(tokensBefore);
                    expect(minted).to.be.gt('0');

                    // eslint-disable-next-line max-len
                    const balancesBefore = await Promise.all(underlyingCoins.map(async (c) => balanceOf(c, senderAddr)));

                    await approve(poolData[poolName].lpTokenAddr, proxyAddr);
                    await curveWithdraw(
                        proxy,
                        senderAddr,
                        senderAddr,
                        poolData[poolName].swapAddr,
                        poolData[poolName].lpTokenAddr,
                        minted,
                        amounts.map(() => withdrawAmount),
                        underlyingCoins,
                        true,
                        true,
                    );

                    // eslint-disable-next-line max-len
                    const balancesAfter = await Promise.all(underlyingCoins.map(async (c) => balanceOf(c, senderAddr)));

                    const nominalBalanceDelta = balancesAfter.reduce((prev, e) => prev.add(e)).sub(
                        balancesBefore.reduce((prev, e) => prev.add(e)),
                    );

                    expect(nominalBalanceDelta).to.be.gt('0');
                });
            }
            if (poolData[poolName].depositAddr == null) return;
            it(`... should deposit and then withdraw [underlyingCoins] via [depositContract] ${poolName}`, async () => {
                const underlyingCoins = poolData[poolName].underlyingCoins;
                const decimals = poolData[poolName].underlyingDecimals;
                const amounts = decimals.map((e) => Float2BN(amount, e));

                await Promise.all(underlyingCoins.map(async (c, i) => {
                    let coinToApprove = c;
                    if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                    await setBalance(coinToApprove, senderAddr, amounts[i]);
                    await approve(coinToApprove, proxyAddr);
                }));

                const tokensBefore = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                await curveDeposit(proxy, senderAddr, senderAddr, poolData[poolName].depositAddr, poolData[poolName].lpTokenAddr, '0', amounts, underlyingCoins, false);
                const tokensAfter = await balanceOf(poolData[poolName].lpTokenAddr, senderAddr);
                const minted = tokensAfter.sub(tokensBefore);
                expect(minted).to.be.gt('0');

                // eslint-disable-next-line max-len
                const balancesBefore = await Promise.all(underlyingCoins.map(async (c) => balanceOf(c, senderAddr)));

                await approve(poolData[poolName].lpTokenAddr, proxyAddr);
                await curveWithdraw(
                    proxy,
                    senderAddr,
                    senderAddr,
                    poolData[poolName].depositAddr,
                    poolData[poolName].lpTokenAddr,
                    minted,
                    amounts.map(() => withdrawAmount),
                    underlyingCoins,
                    true,
                    false,
                );

                // eslint-disable-next-line max-len
                const balancesAfter = await Promise.all(underlyingCoins.map(async (c) => balanceOf(c, senderAddr)));

                const nominalBalanceDelta = balancesAfter.reduce((prev, e) => prev.add(e)).sub(
                    balancesBefore.reduce((prev, e) => prev.add(e)),
                );

                expect(nominalBalanceDelta).to.be.gt('0');
            });
        });
    });
};

const curveGaugeDepositTest = async (testLength) => {
    describe('Curve-Gauge-Deposit', function () {
        this.timeout(1000000);
        const amount = '1000';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let curveView;

        before(async () => {
            await resetForkToBlock(13000000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await redeploy('CurveDeposit');
            await redeploy('CurveGaugeDeposit');
            curveView = await redeploy('CurveView');
        });

        Object.keys(poolData).slice(0, testLength).forEach(async (poolName) => {
            const pool = poolData[poolName];

            it(`... should deposit LP tokens([coins, swapContract]) into gauge ${poolName}`, async () => {
                const coins = pool.coins;
                const amounts = pool.decimals.map((e) => Float2BN(amount, e));

                await Promise.all(coins.map(async (c, i) => {
                    let coinToApprove = c;
                    if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                    await setBalance(coinToApprove, senderAddr, amounts[i]);
                    await approve(coinToApprove, proxyAddr);
                }));

                const tokensBefore = await balanceOf(pool.lpTokenAddr, senderAddr);
                await curveDeposit(proxy, senderAddr, senderAddr, pool.swapAddr, pool.lpTokenAddr, '0', amounts, coins, false);
                const tokensAfter = await balanceOf(pool.lpTokenAddr, senderAddr);
                const minted = tokensAfter.sub(tokensBefore);
                expect(minted).to.be.gt('0');

                await approve(pool.lpTokenAddr, proxyAddr);
                // eslint-disable-next-line max-len
                await curveGaugeDeposit(proxy, pool.gaugeAddr, pool.lpTokenAddr, senderAddr, proxyAddr, minted);
                expect(await curveView.gaugeBalance(pool.gaugeAddr, proxyAddr)).to.be.gt('0');
            });
            if (pool.useUnderlying) {
                it(`... should deposit LP tokens([underlyingCoins, swapContract]) into gauge ${poolName}`, async () => {
                    const underlyingCoins = pool.underlyingCoins;
                    const amounts = pool.underlyingDecimals.map((e) => Float2BN(amount, e));

                    await Promise.all(underlyingCoins.map(async (c, i) => {
                        let coinToApprove = c;
                        if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                        await setBalance(coinToApprove, senderAddr, amounts[i]);
                        await approve(coinToApprove, proxyAddr);
                    }));

                    const tokensBefore = await balanceOf(pool.lpTokenAddr, senderAddr);
                    await curveDeposit(proxy, senderAddr, senderAddr, pool.swapAddr, pool.lpTokenAddr, '0', amounts, underlyingCoins, true);
                    const tokensAfter = await balanceOf(pool.lpTokenAddr, senderAddr);
                    const minted = tokensAfter.sub(tokensBefore);
                    expect(minted).to.be.gt('0');

                    await approve(pool.lpTokenAddr, proxyAddr);
                    // eslint-disable-next-line max-len
                    await curveGaugeDeposit(proxy, pool.gaugeAddr, pool.lpTokenAddr, senderAddr, proxyAddr, minted);
                    expect(await curveView.gaugeBalance(pool.gaugeAddr, proxyAddr)).to.be.gt('0');
                });
            }
            if (pool.depositAddr == null) return;
            it(`... should deposit LP tokens([underlyingCoins, depositContract]) into gauge ${poolName}`, async () => {
                const underlyingCoins = pool.underlyingCoins;
                const amounts = pool.underlyingDecimals.map((e) => Float2BN(amount, e));

                await Promise.all(underlyingCoins.map(async (c, i) => {
                    let coinToApprove = c;
                    if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                    await setBalance(coinToApprove, senderAddr, amounts[i]);
                    await approve(coinToApprove, proxyAddr);
                }));

                const tokensBefore = await balanceOf(pool.lpTokenAddr, senderAddr);
                await curveDeposit(proxy, senderAddr, senderAddr, pool.depositAddr, pool.lpTokenAddr, '0', amounts, underlyingCoins, false);
                const tokensAfter = await balanceOf(pool.lpTokenAddr, senderAddr);
                const minted = tokensAfter.sub(tokensBefore);
                expect(minted).to.be.gt('0');

                await approve(pool.lpTokenAddr, proxyAddr);
                // eslint-disable-next-line max-len
                await curveGaugeDeposit(proxy, pool.gaugeAddr, pool.lpTokenAddr, senderAddr, proxyAddr, minted);
                expect(await curveView.gaugeBalance(pool.gaugeAddr, proxyAddr)).to.be.gt('0');
            });
        });
    });
};

const curveGaugeWithdrawTest = async (testLength) => {
    describe('Curve-Gauge-Withdraw', function () {
        this.timeout(1000000);
        const amount = '1000';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let curveView;

        before(async () => {
            await resetForkToBlock(13000000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await redeploy('CurveDeposit');
            await redeploy('CurveGaugeDeposit');
            await redeploy('CurveGaugeWithdraw');
            curveView = await redeploy('CurveView');
        });

        Object.keys(poolData).slice(0, testLength).forEach(async (poolName) => {
            const pool = poolData[poolName];

            it(`... should deposit LP tokens([coins, swapContract]) into gauge, then withdraw ${poolName}`, async () => {
                const coins = pool.coins;
                const amounts = pool.decimals.map((e) => Float2BN(amount, e));

                await Promise.all(coins.map(async (c, i) => {
                    let coinToApprove = c;
                    if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                    await setBalance(coinToApprove, senderAddr, amounts[i]);
                    await approve(coinToApprove, proxyAddr);
                }));

                const tokensBefore = await balanceOf(pool.lpTokenAddr, senderAddr);
                await curveDeposit(proxy, senderAddr, senderAddr, pool.swapAddr, pool.lpTokenAddr, '0', amounts, coins, false);
                const tokensAfter = await balanceOf(pool.lpTokenAddr, senderAddr);
                const minted = tokensAfter.sub(tokensBefore);
                expect(minted).to.be.gt('0');

                await approve(pool.lpTokenAddr, proxyAddr);
                // eslint-disable-next-line max-len
                await curveGaugeDeposit(proxy, pool.gaugeAddr, pool.lpTokenAddr, senderAddr, proxyAddr, minted);
                expect(await curveView.gaugeBalance(pool.gaugeAddr, proxyAddr)).to.be.eq(minted);
                // eslint-disable-next-line max-len
                await curveGaugeWithdraw(proxy, pool.gaugeAddr, pool.lpTokenAddr, senderAddr, hre.ethers.constants.MaxUint256);
                expect(await balanceOf(pool.lpTokenAddr, senderAddr)).to.be.eq(tokensAfter);
            });
            if (pool.useUnderlying) {
                it(`... should deposit LP tokens([underlyingCoins, swapContract]) into gauge, then withdraw ${poolName}`, async () => {
                    const underlyingCoins = pool.underlyingCoins;
                    const amounts = pool.underlyingDecimals.map((e) => Float2BN(amount, e));

                    await Promise.all(underlyingCoins.map(async (c, i) => {
                        let coinToApprove = c;
                        if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                        await setBalance(coinToApprove, senderAddr, amounts[i]);
                        await approve(coinToApprove, proxyAddr);
                    }));

                    const tokensBefore = await balanceOf(pool.lpTokenAddr, senderAddr);
                    await curveDeposit(proxy, senderAddr, senderAddr, pool.swapAddr, pool.lpTokenAddr, '0', amounts, underlyingCoins, true);
                    const tokensAfter = await balanceOf(pool.lpTokenAddr, senderAddr);
                    const minted = tokensAfter.sub(tokensBefore);
                    expect(minted).to.be.gt('0');

                    await approve(pool.lpTokenAddr, proxyAddr);
                    // eslint-disable-next-line max-len
                    await curveGaugeDeposit(proxy, pool.gaugeAddr, pool.lpTokenAddr, senderAddr, proxyAddr, minted);
                    // eslint-disable-next-line max-len
                    expect(await curveView.gaugeBalance(pool.gaugeAddr, proxyAddr)).to.be.eq(minted);
                    // eslint-disable-next-line max-len
                    await curveGaugeWithdraw(proxy, pool.gaugeAddr, pool.lpTokenAddr, senderAddr, hre.ethers.constants.MaxUint256);
                    expect(await balanceOf(pool.lpTokenAddr, senderAddr)).to.be.eq(tokensAfter);
                });
            }
            if (pool.depositAddr == null) return;
            it(`... should deposit LP tokens([underlyingCoins, depositContract]) into gauge, then withdraw ${poolName}`, async () => {
                const underlyingCoins = pool.underlyingCoins;
                const amounts = pool.underlyingDecimals.map((e) => Float2BN(amount, e));

                await Promise.all(underlyingCoins.map(async (c, i) => {
                    let coinToApprove = c;
                    if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                    await setBalance(coinToApprove, senderAddr, amounts[i]);
                    await approve(coinToApprove, proxyAddr);
                }));

                const tokensBefore = await balanceOf(pool.lpTokenAddr, senderAddr);
                await curveDeposit(proxy, senderAddr, senderAddr, pool.depositAddr, pool.lpTokenAddr, '0', amounts, underlyingCoins, false);
                const tokensAfter = await balanceOf(pool.lpTokenAddr, senderAddr);
                const minted = tokensAfter.sub(tokensBefore);
                expect(minted).to.be.gt('0');

                await approve(pool.lpTokenAddr, proxyAddr);
                // eslint-disable-next-line max-len
                await curveGaugeDeposit(proxy, pool.gaugeAddr, pool.lpTokenAddr, senderAddr, proxyAddr, minted);
                expect(await curveView.gaugeBalance(pool.gaugeAddr, proxyAddr)).to.be.eq(minted);
                // eslint-disable-next-line max-len
                await curveGaugeWithdraw(proxy, pool.gaugeAddr, pool.lpTokenAddr, senderAddr, hre.ethers.constants.MaxUint256);
                expect(await balanceOf(pool.lpTokenAddr, senderAddr)).to.be.eq(tokensAfter);
            });
        });
    });
};

const curveClaimFeesTest = async () => {
    describe('Curve-Claim-Fees', function () {
        this.timeout(1000000);

        const claimFor = '0x7563839e02004d3f419ff78df4256e9c5dd713ed';
        const WEEK = 3600 * 24 * 7;

        let senderAcc;
        let proxy;
        let curveView; let crv3crvToken;
        let feesRewarded;

        before(async () => {
            await resetForkToBlock(13000000);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await redeploy('CurveClaimFees');
            curveView = await redeploy('CurveView');
            crv3crvToken = await curveView['CRV_3CRV_TOKEN_ADDR()']();
        });

        after(async () => {
            console.log(`3Crv rewarded: ${BN2Float(feesRewarded)}`);
        });

        it('... should claim rewards', async () => {
            await timeTravel(WEEK);
            const balanceBefore = await balanceOf(crv3crvToken, claimFor);

            await curveClaimFees(proxy, claimFor, claimFor);

            feesRewarded = (await balanceOf(crv3crvToken, claimFor)).sub(balanceBefore);

            expect(feesRewarded).to.be.gt(0);
        });
    });
};

const curveStethPoolDepositTest = async () => {
    const STE_CRV_ADDR = '0x06325440D014e39736583c165C2963BA99fAf14E';

    describe('Curve-Steth-Pool-Deposit', function () {
        this.timeout(1000000);
        const ethAmount = '10';
        const ethAmountHalf = '5';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;

        before(async () => {
            await resetForkToBlock(13000000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await redeploy('CurveStethPoolDeposit');
        });

        it(`... should deposit ${ethAmount} Eth into Curve stEth pool`, async () => {
            const amount = Float2BN(ethAmount);

            await setBalance(WETH_ADDRESS, senderAddr, amount);
            await approve(WETH_ADDRESS, proxyAddr);

            const tokensBefore = await balanceOf(STE_CRV_ADDR, senderAddr);
            await curveStethPoolDeposit(
                proxy,
                senderAddr,
                senderAddr,
                [amount, '0'],
                '0',
            );

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpMinted = tokensAfter.sub(tokensBefore);

            console.log(`Minted ${BN2Float(lpMinted)} steCrv`);
            expect(lpMinted).to.be.gt('0');
        });

        it(`... should deposit ${ethAmount} stEth into Curve stEth pool`, async () => {
            const amount = Float2BN(ethAmount);

            await setBalance(STETH_ADDRESS, senderAddr, amount);
            await approve(STETH_ADDRESS, proxyAddr);

            const tokensBefore = await balanceOf(STE_CRV_ADDR, senderAddr);
            await curveStethPoolDeposit(
                proxy,
                senderAddr,
                senderAddr,
                ['0', amount],
                '0',
            );

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpMinted = tokensAfter.sub(tokensBefore);

            console.log(`Minted ${BN2Float(lpMinted)} steCrv`);
            expect(lpMinted).to.be.gt('0');
        });

        it(`... should deposit ${ethAmountHalf} stEth and ${ethAmountHalf} Eth into Curve stEth pool`, async () => {
            const amount = Float2BN(ethAmountHalf);

            await setBalance(WETH_ADDRESS, senderAddr, amount);
            await approve(WETH_ADDRESS, proxyAddr);
            await setBalance(STETH_ADDRESS, senderAddr, amount);
            await approve(STETH_ADDRESS, proxyAddr);

            const tokensBefore = await balanceOf(STE_CRV_ADDR, senderAddr);
            await curveStethPoolDeposit(
                proxy,
                senderAddr,
                senderAddr,
                [amount, amount],
                '0',
            );

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpMinted = tokensAfter.sub(tokensBefore);

            console.log(`Minted ${BN2Float(lpMinted)} steCrv`);
            expect(lpMinted).to.be.gt('0');
        });

        it('... should deposit maxUint stEth and Eth into Curve stEth pool', async () => {
            const amount = Float2BN(ethAmountHalf);

            await setBalance(WETH_ADDRESS, senderAddr, amount);
            await approve(WETH_ADDRESS, proxyAddr);
            await setBalance(STETH_ADDRESS, senderAddr, amount);
            await approve(STETH_ADDRESS, proxyAddr);

            const tokensBefore = await balanceOf(STE_CRV_ADDR, senderAddr);
            await curveStethPoolDeposit(
                proxy,
                senderAddr,
                senderAddr,
                [hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
                '0',
            );

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpMinted = tokensAfter.sub(tokensBefore);

            console.log(`Minted ${BN2Float(lpMinted)} steCrv`);
            expect(lpMinted).to.be.gt('0');
        });
    });
};

const curveStethPoolWithdrawTest = async () => {
    const STE_CRV_ADDR = '0x06325440D014e39736583c165C2963BA99fAf14E';

    describe('Curve-Steth-Pool-Withdraw', function () {
        this.timeout(1000000);
        const amount = '10';
        const amountHalf = '5';

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;

        before(async () => {
            await resetForkToBlock(13000000);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await redeploy('CurveStethPoolWithdraw');
        });

        it(`... should burn ${amount} steCrv and withdraw ${amount} Eth`, async () => {
            const maxBurnAmount = Float2BN(amount);

            await setBalance(STE_CRV_ADDR, senderAddr, maxBurnAmount);
            await approve(STE_CRV_ADDR, proxyAddr);

            const wethBefore = await balanceOf(WETH_ADDRESS, senderAddr);

            await curveStethPoolWithdraw(
                proxy,
                senderAddr,
                senderAddr,
                [maxBurnAmount, '0'],
                maxBurnAmount,
            );

            const wethAfter = await balanceOf(WETH_ADDRESS, senderAddr);

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpBurned = maxBurnAmount.sub(tokensAfter);
            const wethWithdrawn = wethAfter.sub(wethBefore);
            expect(+BN2Float(wethWithdrawn)).to.be.closeTo(+BN2Float(maxBurnAmount), 0.01);
            console.log(`Withdrawn ${BN2Float(wethWithdrawn)} WETH burning ${BN2Float(lpBurned)} steCrv`);
        });

        it(`... should burn ${amount} steCrv and withdraw ${amount} stEth`, async () => {
            const maxBurnAmount = Float2BN(amount);

            await setBalance(STE_CRV_ADDR, senderAddr, maxBurnAmount);
            await approve(STE_CRV_ADDR, proxyAddr);

            const stethBefore = await balanceOf(STETH_ADDRESS, senderAddr);

            await curveStethPoolWithdraw(
                proxy,
                senderAddr,
                senderAddr,
                ['0', maxBurnAmount],
                maxBurnAmount,
            );

            const stethAfter = await balanceOf(STETH_ADDRESS, senderAddr);

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpBurned = maxBurnAmount.sub(tokensAfter);
            const stethWithdrawn = stethAfter.sub(stethBefore);
            expect(+BN2Float(stethWithdrawn)).to.be.closeTo(+BN2Float(maxBurnAmount), 0.01);
            console.log(`Withdrawn ${BN2Float(stethWithdrawn)} stEth burning ${BN2Float(lpBurned)} steCrv`);
        });

        it(`... should burn ${amount} steCrv and withdraw ${amountHalf} Eth and ${amountHalf} stEth`, async () => {
            const maxBurnAmount = Float2BN(amount);
            const withdrawAmount = Float2BN(amountHalf);

            await setBalance(STE_CRV_ADDR, senderAddr, maxBurnAmount);
            await approve(STE_CRV_ADDR, proxyAddr);

            const wethBefore = await balanceOf(WETH_ADDRESS, senderAddr);
            const stethBefore = await balanceOf(STETH_ADDRESS, senderAddr);

            await curveStethPoolWithdraw(
                proxy,
                senderAddr,
                senderAddr,
                [withdrawAmount, withdrawAmount],
                maxBurnAmount,
            );

            const wethAfter = await balanceOf(WETH_ADDRESS, senderAddr);
            const stethAfter = await balanceOf(STETH_ADDRESS, senderAddr);

            const tokensAfter = await balanceOf(STE_CRV_ADDR, senderAddr);
            const lpBurned = maxBurnAmount.sub(tokensAfter);
            const wethWithdrawn = wethAfter.sub(wethBefore);
            const stethWithdrawn = stethAfter.sub(stethBefore);
            expect(+BN2Float(wethWithdrawn)).to.be.closeTo(+BN2Float(withdrawAmount), 0.01);
            expect(+BN2Float(stethWithdrawn)).to.be.closeTo(+BN2Float(withdrawAmount), 0.01);
            console.log(`Withdrawn ${BN2Float(wethWithdrawn)} WETH and ${BN2Float(stethWithdrawn)} stEth burning ${BN2Float(lpBurned)} steCrv`);
        });
    });
};

const curveFullTest = async (testLength) => {
    await curveDepositTest(testLength);
    await curveWithdrawTest(testLength);
    await curveWithdrawExactTest(testLength);
    await curveGaugeDepositTest(testLength);
    await curveGaugeWithdrawTest(testLength);
    await curveClaimFeesTest();
};

module.exports = {
    curveFullTest,

    curveDepositTest,
    curveWithdrawTest,
    curveWithdrawExactTest,

    curveGaugeDepositTest,
    curveGaugeWithdrawTest,
    curveClaimFeesTest,

    curveStethPoolDepositTest,
    curveStethPoolWithdrawTest,
};
