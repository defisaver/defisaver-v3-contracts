const hre = require('hardhat');

const UNISWAP_FACTORY_ADDR = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
const UNISWAP_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

const getPair = async (tokenA, tokenB) => {
    const uniswapFactory = await hre.ethers.getContractAt('IUniswapV2Factory', UNISWAP_FACTORY_ADDR);

    const pairAddr = await uniswapFactory.getPair(tokenA, tokenB);

    const pair = await hre.ethers.getContractAt('IPair', pairAddr);

    const token0 = await pair.token0();
    const token1 = await pair.token1();

    return {
        pairAddr,
        tokenA: token0,
        tokenB: token1,
    };
};

const getReserves = async (pairAddr) => {
    const pair = await hre.ethers.getContractAt('IPair', pairAddr);
    const reserves = await pair.getReserves();

    return reserves;
};

const getSecondTokenAmount = async (tokenA, tokenB, amountTokenA) => {
    const pairData = await getPair(tokenA, tokenB);
    const reserves = await getReserves(pairData.pairAddr);

    let reserveA = reserves[0];
    let reserveB = reserves[1];

    // pair order can be switched, you send eth/dai but it's dai/eth
    if (pairData.tokenA.toLowerCase() !== tokenA.toLowerCase()) {
        // eslint-disable-next-line prefer-destructuring
        reserveA = reserves[1];
        // eslint-disable-next-line prefer-destructuring
        reserveB = reserves[0];
    }

    const uniRouter = await hre.ethers.getContractAt('IUniswapRouter', UNISWAP_ROUTER);
    const amountTokenB = await uniRouter.quote(amountTokenA, reserveA, reserveB);

    return amountTokenB;
};

module.exports = {
    getPair,
    getReserves,
    getSecondTokenAmount,
};
