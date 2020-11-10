const { expect } = require("chai");

const { getAssetInfo } = require('defisaver-tokens');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    approve,
    balanceOf,
    nullAddress,
    REGISTRY_ADDR,
    UNISWAP_WRAPPER,
    KYBER_WRAPPER,
    WETH_ADDRESS
} = require('../utils');

const {
    sell,
} = require('../actions.js');


// TODO: check stuff like price and slippage
// TODO: can we make it work with 0x?

describe("Dfs-Sell", function() {
    let senderAcc, proxy;

    const tokens = [
        {sellToken: "ETH", buyToken: "DAI", amount: "1"},
        {sellToken: "DAI", buyToken: "WBTC", amount: "200"},
        {sellToken: "ETH", buyToken: "USDC", amount: "1"},
        {sellToken: "USDC", buyToken: "ETH", amount: "100"},
        {sellToken: "ETH", buyToken: "USDT", amount: "1"},
        {sellToken: "USDT", buyToken: "BAT", amount: "150"},
    ];

    before(async () => {

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        this.timeout(40000);
    });

    for (let i = 0; i < tokens.length; ++i) {
        const token = tokens[i];

        it(`... should sell ${token.sellToken} for a ${token.buyToken}`, async () => {
            const buyAddr = getAssetInfo(token.buyToken).address;

            const buyBalanceBefore = await balanceOf(buyAddr, senderAcc.address);

            await sell(
                proxy,
                token.sellToken,
                token.buyToken,
                token.amount,
                senderAcc.address,
                senderAcc.address
            );
           
            const buyBalanceAfter = await balanceOf(buyAddr, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });

    }

});