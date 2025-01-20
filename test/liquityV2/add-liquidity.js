/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
const hre = require('hardhat');
const {
    getOwnerAddr,
    getProxy,
    setBalance,
    isNetworkFork,
    BOLD_ADDR,
} = require('../utils');
const { topUp } = require('../../scripts/utils/fork');
const { uniV3CreatePool } = require('../actions');

// @dev Adapted from: https://uniswapv3book.com/milestone_1/calculating-liquidity.html
function calculateTicksAndAmounts(prices, amount0Before, amount1Before) {
    const q96 = 2 ** 96;

    const priceToSqrtP = (p) => Math.floor(Math.sqrt(p) * q96);

    const tick = (p) => Math.floor(Math.log(p) / Math.log(1.0001));

    const liquidity0 = (amount, pa, pb) => {
        if (pa > pb) [pa, pb] = [pb, pa];
        return ((amount * (pa * pb)) / (q96)) / (pb - pa);
    };

    const liquidity1 = (amount, pa, pb) => {
        if (pa > pb) [pa, pb] = [pb, pa];
        return (amount * q96) / (pb - pa);
    };

    const calcAmount0 = (liq, pa, pb) => {
        if (pa > pb) [pa, pb] = [pb, pa];
        return Math.floor((liq * q96 * (pb - pa)) / (pa * pb));
    };

    const calcAmount1 = (liq, pa, pb) => {
        if (pa > pb) [pa, pb] = [pb, pa];
        return Math.floor((liq * (pb - pa)) / q96);
    };

    const [priceLow, priceCur, priceUpp] = prices;

    const sqrtLow = priceToSqrtP(priceLow);
    const sqrtCur = priceToSqrtP(priceCur);
    const sqrtUpp = priceToSqrtP(priceUpp);

    const lowTick = tick(priceLow);
    const curTick = tick(priceCur);
    const uppTick = tick(priceUpp);

    const liq0 = liquidity0(amount0Before, sqrtCur, sqrtUpp);
    const liq1 = liquidity1(amount1Before, sqrtCur, sqrtLow);
    const liq = Math.floor(Math.min(liq0, liq1));

    const amount0 = calcAmount0(liq, sqrtUpp, sqrtCur);
    const amount1 = calcAmount1(liq, sqrtLow, sqrtCur);

    return {
        ticks: [lowTick, curTick, uppTick],
        sqrtPrices: [sqrtLow, sqrtCur, sqrtUpp],
        amount0,
        amount1,
    };
}

const createUniV3Pool = async (
    token0,
    token1,
    token0Amount,
    token1Amount,
    lowerPrice,
    currentPrice,
    upperPrice,
    fee,
    senderAcc,
    proxy,
) => {
    const {
        ticks,
        sqrtPrices,
        amount0,
        amount1,
    } = calculateTicksAndAmounts(
        [lowerPrice, currentPrice, upperPrice],
        token0Amount,
        token1Amount,
    );
    console.log('ticks:', ticks);
    console.log('sqrtPrices:', sqrtPrices);
    console.log('amount0:', amount0);
    console.log('amount1:', amount1);
    await setBalance(token0, senderAcc.address, token0Amount);
    await setBalance(token1, senderAcc.address, token1Amount);
    await uniV3CreatePool(
        proxy,
        token0,
        token1,
        fee,
        ticks[0],
        ticks[2],
        amount0,
        amount1,
        senderAcc.address,
        senderAcc.address,
        sqrtPrices[1],
    );
};

const addLiquidity = async (isFork) => {
    describe('addLiquidity', function () {
        this.timeout(100000);
        let senderAcc;
        let proxy;
        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            console.log('isFork:', isFork);
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
            }
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        });
        it('...test add liquidity', async () => {
            const bold = BOLD_ADDR;
            const dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

            const daiBoldLowerPrice = 0.99;
            const daiBoldCurrentPrice = 1;
            const daiBoldUpperPrice = 1.01;

            const daiDepositLiquidity = hre.ethers.utils.parseUnits('1000000000', 18);
            const boldDepositLiquidity = hre.ethers.utils.parseUnits('1000000000', 18);

            const fee = '100';

            await createUniV3Pool(
                dai,
                bold,
                daiDepositLiquidity,
                boldDepositLiquidity,
                daiBoldLowerPrice,
                daiBoldCurrentPrice,
                daiBoldUpperPrice,
                fee,
                senderAcc,
                proxy,
            );
        });
    });
};

describe('Add BOLD liquidity', function () {
    this.timeout(300000);
    it('...test add bold liquidity', async () => {
        await addLiquidity(isNetworkFork());
    }).timeout(300000);
});
