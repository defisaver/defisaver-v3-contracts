const { default: axios } = require('axios');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const { set } = require('@defisaver/tokens');
const {
    redeploy,
    getProxy,
    setNewExchangeWrapper, curveApiInit,
} = require('../utils');

const { executeSell } = require('./exchange-tests');

describe('Arbitrum wrappers test', function () {
    this.timeout(140000);
    set('network', 42161);

    let senderAcc;
    let proxy;
    let uniWrapper;
    let uniV3Wrapper;
    let curveWrapper;
    let dfsPrices;

    const network = hre.network.config.name;
    const trades = [
        {
            sellToken: 'WETH', buyToken: 'DAI', amount: '1', fee: 3000,
        },
        {
            sellToken: 'DAI', buyToken: 'WBTC', amount: '30000', fee: 3000,
        },
        {
            sellToken: 'WETH', buyToken: 'USDC', amount: '1', fee: 3000,
        },
        {
            sellToken: 'USDC', buyToken: 'WETH', amount: '3000', fee: 3000,
        },
        {
            sellToken: 'WETH', buyToken: 'USDT', amount: '1', fee: 3000,
        },
        {
            sellToken: 'DAI', buyToken: 'USDC', amount: '3000', fee: 500,
        },
    ];
    const curveTrades = [
        {
            sellToken: 'WETH', buyToken: 'LUSD', amount: '1',
        },
        {
            sellToken: 'LUSD', buyToken: 'WETH', amount: '3000',
        },
        {
            sellToken: 'WETH', buyToken: 'STETH', amount: '1',
        },
        {
            sellToken: 'STETH', buyToken: 'WETH', amount: '1',
        },
    ];

    before(async () => {
        await curveApiInit();
        await redeploy('DFSSell');

        dfsPrices = await redeploy('DFSPrices');

        uniWrapper = await redeploy('UniswapWrapperV3');
        uniV3Wrapper = await redeploy('UniV3WrapperV3');
        curveWrapper = await redeploy('CurveWrapperV3');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
        await setNewExchangeWrapper(senderAcc, uniV3Wrapper.address);
        await setNewExchangeWrapper(senderAcc, curveWrapper.address);
    });

    for (let i = 0; i < 1; ++i) {
        const trade = trades[i];
        console.log(i);
        it(`... should sell ${trade.sellToken} for ${trade.buyToken}`, async () => {
            const uniRate = await executeSell(
                senderAcc, proxy, dfsPrices,
                { ...trade, fee: 0 },
                uniWrapper,
            );
            console.log(`Uniswap sell rate -> ${uniRate}`);

            const uniV3Rate = await executeSell(senderAcc, proxy, dfsPrices, trade, uniV3Wrapper);
            console.log(`UniswapV3 sell rate -> ${uniV3Rate}`);
            /*
            const curveRate = await executeSell(
                senderAcc,
                proxy,
                dfsPrices,
                trade,
                curveWrapper,
                true,
            );
            console.log(`Curve sell rate -> ${curveRate}`);

            */
        });
    }
});
