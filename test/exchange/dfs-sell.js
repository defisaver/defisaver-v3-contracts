const { expect } = require("chai");

const { getAssetInfo } = require('@defisaver/tokens');
const dfs = require('defisaver-sdk');


const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    approve,
    balanceOf,
    formatExchangeObj,
    nullAddress,
    REGISTRY_ADDR,
    UNISWAP_WRAPPER,
    KYBER_WRAPPER,
    WETH_ADDRESS,
    isEth
} = require('../utils');

const {
    sell,
} = require('../actions.js');


// TODO: check stuff like price and slippage
// TODO: can we make it work with 0x?

describe("Dfs-Sell", function() {
    this.timeout(40000);

    let senderAcc, proxy, dfsSellAddr;

    const trades = [
        {sellToken: "ETH", buyToken: "DAI", amount: "1"},
        {sellToken: "DAI", buyToken: "WBTC", amount: "200"},
        {sellToken: "ETH", buyToken: "USDC", amount: "1"},
        {sellToken: "USDC", buyToken: "ETH", amount: "100"},
        {sellToken: "ETH", buyToken: "USDT", amount: "1"},
        {sellToken: "USDT", buyToken: "BAT", amount: "150"},
    ];

    before(async () => {
        await redeploy('DFSSell');
        
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        dfsSellAddr = await getAddrFromRegistry('DFSSell');

    });

    for (let i = 0; i < trades.length; ++i) {
        const trade = trades[i];

        it(`... should sell ${trade.sellToken} for a ${trade.buyToken}`, async () => {
            const sellAddr = getAssetInfo(trade.sellToken).address;
            const buyAddr = getAssetInfo(trade.buyToken).address;

            const buyBalanceBefore = await balanceOf(buyAddr, senderAcc.address);

            const amount = trade.amount * 10**getAssetInfo(trade.sellToken).decimals;

            await sell(proxy, sellAddr, buyAddr, amount, UNISWAP_WRAPPER, senderAcc.address, senderAcc.address);
           
            const buyBalanceAfter = await balanceOf(buyAddr, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });

    }

});