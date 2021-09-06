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
    curveMintCrvMany,
} = require('../../actions.js');

const poolData = require('../poolData');

describe('Curve-Mint-Crv-Many', function () {
    this.timeout(1000000);
    const amount = '1000';

    const CrvAddr = '0xD533a949740bb3306d119CC777fa900bA034cd52';

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
        await redeploy('CurveMintCrvMany');
        curveView = await redeploy('CurveView');
    });

    Object.keys(poolData).forEach(async (poolName) => {
        const pool = poolData[poolName];

        it(`... should deposit [coins] via [swapContract] ${poolName}`, async () => {
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
        });
        if (pool.useUnderlying) {
            it(`... should deposit [underlyingCoins] via [swapContract] ${poolName}`, async () => {
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
            });
        }
        if (pool.depositAddr == null) return;
        it(`... should deposit [underlyingCoins] via [depositContract] ${poolName}`, async () => {
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
        });
    });

    const poolNames = Object.keys(poolData);
    for (let i = 0; i < Math.floor(poolNames.length / 8); i++) {
        it(`... should mint crv batch ${i}`, async () => {
            const CrvB4 = await balanceOf(CrvAddr, senderAddr);
            await curveMintCrvMany(
                proxy,
                poolNames.slice(i * 8, (i + 1) * 8).map((e) => poolData[e].gaugeAddr),
                senderAddr,
            );

            const CrvAfter = await balanceOf(CrvAddr, senderAddr);
            expect(CrvAfter.sub(CrvB4)).to.be.gt('0');
        });
    }

    it('... should mint crv padded batch', async () => {
        const CrvB4 = await balanceOf(CrvAddr, senderAddr);
        let batch = poolNames.slice(
            Math.floor(poolNames.length / 8) * 8,
        ).map((e) => poolData[e].gaugeAddr);

        batch = batch.concat(Array(8 - batch.length).fill('0x0000000000000000000000000000000000000000'));
        await curveMintCrvMany(
            proxy,
            batch,
            senderAddr,
        );

        const CrvAfter = await balanceOf(CrvAddr, senderAddr);
        expect(CrvAfter.sub(CrvB4)).to.be.gt('0');
    });
});
