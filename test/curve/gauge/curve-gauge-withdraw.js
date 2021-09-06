const { expect } = require('chai');
const hre = require('hardhat');

const {
    balanceOf,
    getProxy,
    redeploy,
    approve,
    ETH_ADDR,
    WETH_ADDRESS,
} = require('../../utils');

const {
    buyTokenIfNeeded,
    curveDeposit,
    curveGaugeDeposit,
    curveGaugeWithdraw,
} = require('../../actions.js');

const poolData = require('../poolData');

describe('Curve-Gauge-Withdraw', function () {
    this.timeout(1000000);
    const amount = '1000';

    let senderAcc; let senderAddr;
    let proxy; let proxyAddr;
    let curveView;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        senderAddr = senderAcc.address;
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        await redeploy('CurveDeposit');
        await redeploy('CurveGaugeDeposit');
        await redeploy('CurveGaugeWithdraw');
        curveView = await redeploy('CurveView');
    });

    Object.keys(poolData).forEach(async (poolName) => {
        const pool = poolData[poolName];

        it(`... should deposit LP tokens([coins, swapContract]) into gauge, then withdraw ${poolName}`, async () => {
            const coins = pool.coins;
            const amounts = coins.map(() => amount);

            await Promise.all(coins.map(async (c, i) => {
                let coinToApprove = c;
                if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                await buyTokenIfNeeded(coinToApprove, senderAcc, proxy, amounts[i]);
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
            await curveGaugeWithdraw(proxy, pool.gaugeAddr, senderAddr, hre.ethers.constants.MaxUint256);
            expect(await balanceOf(pool.lpTokenAddr, senderAddr)).to.be.eq(tokensAfter);
        });
        if (pool.useUnderlying) {
            it(`... should deposit LP tokens([underlyingCoins, swapContract]) into gauge, then withdraw ${poolName}`, async () => {
                const underlyingCoins = pool.underlyingCoins;
                const amounts = underlyingCoins.map(() => amount);

                await Promise.all(underlyingCoins.map(async (c, i) => {
                    let coinToApprove = c;
                    if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                    await buyTokenIfNeeded(coinToApprove, senderAcc, proxy, amounts[i]);
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
                expect(await curveView.gaugeBalance(pool.gaugeAddr, proxyAddr)).to.be.eq(minted);
                // eslint-disable-next-line max-len
                await curveGaugeWithdraw(proxy, pool.gaugeAddr, senderAddr, hre.ethers.constants.MaxUint256);
                expect(await balanceOf(pool.lpTokenAddr, senderAddr)).to.be.eq(tokensAfter);
            });
        }
        if (pool.depositAddr == null) return;
        it(`... should deposit LP tokens([underlyingCoins, depositContract]) into gauge, then withdraw ${poolName}`, async () => {
            const underlyingCoins = pool.underlyingCoins;
            const amounts = underlyingCoins.map(() => amount);

            await Promise.all(underlyingCoins.map(async (c, i) => {
                let coinToApprove = c;
                if (c === ETH_ADDR) coinToApprove = WETH_ADDRESS;
                await buyTokenIfNeeded(coinToApprove, senderAcc, proxy, amounts[i]);
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
            await curveGaugeWithdraw(proxy, pool.gaugeAddr, senderAddr, hre.ethers.constants.MaxUint256);
            expect(await balanceOf(pool.lpTokenAddr, senderAddr)).to.be.eq(tokensAfter);
        });
    });
});
