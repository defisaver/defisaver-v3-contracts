const { expect } = require("chai");

const { getAssetInfo } = require('defisaver-tokens');
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
    buy,
} = require('../actions.js');


// TODO: check stuff like price and slippage
// TODO: can we make it work with 0x?

describe("Dfs-Buy", function() {
    let senderAcc, proxy, dfsSellAddr;

    const trades = [
        {sellToken: "ETH", buyToken: "DAI", sellAmount: "5", buyAmount: "200"},
        {sellToken: "DAI", buyToken: "WBTC", sellAmount: "200", buyAmount: "0.001"},
        {sellToken: "ETH", buyToken: "USDC", sellAmount: "1", buyAmount: "200"},
        {sellToken: "USDC", buyToken: "ETH", sellAmount: "100", buyAmount: "0.1"},
        {sellToken: "ETH", buyToken: "USDT", sellAmount: "1", buyAmount: "200"},
        {sellToken: "USDT", buyToken: "BAT", sellAmount: "150", buyAmount: "20"},
    ];

    before(async () => {
        await redeploy('DFSBuy');
        
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        dfsSellAddr = await getAddrFromRegistry('DFSBuy');

        this.timeout(40000);
    });

    for (let i = 0; i < trades.length; ++i) {
        const trade = trades[i];

        it(`... should buy ${trade.buyAmount} ${trade.buyToken} with ${trade.sellToken}`, async () => {
            const sellAddr = getAssetInfo(trade.sellToken).address;
            const buyAddr = getAssetInfo(trade.buyToken).address;

            const buyBalanceBefore = await balanceOf(buyAddr, senderAcc.address);
            const proxySellBalanceBefore = await balanceOf(sellAddr, proxy.address);
            const proxyBuyBalanceBefore = await balanceOf(buyAddr, proxy.address);

            const sellAmount = ethers.utils.parseUnits(trade.sellAmount, getAssetInfo(trade.sellToken).decimals);
            const buyAmount = ethers.utils.parseUnits(trade.buyAmount, getAssetInfo(trade.buyToken).decimals);

            await buy(proxy, sellAddr, buyAddr, sellAmount, buyAmount, UNISWAP_WRAPPER, senderAcc.address, senderAcc.address);
           
            const buyBalanceAfter = await balanceOf(buyAddr, senderAcc.address);
            const proxySellBalanceAfter = await balanceOf(sellAddr, proxy.address);
            const proxyBuyBalanceAfter = await balanceOf(buyAddr, proxy.address);

            expect(proxyBuyBalanceBefore).to.be.eq(proxyBuyBalanceAfter, "Check if we left over buy token on proxy");
            expect(proxySellBalanceBefore).to.be.eq(proxySellBalanceAfter, "Check if we left over sell token on proxy");

            // because of the eth gas fee
            if (getAssetInfo(trade.buyToken).symbol !== 'ETH') {
                expect(buyBalanceBefore.add(buyAmount)).is.eq(buyBalanceAfter, "Check if we got that exact amount");
            } else {
               expect(buyBalanceAfter).is.gt(buyBalanceBefore, "Check if we got that exact amount");
            }
         
        });

    }

});