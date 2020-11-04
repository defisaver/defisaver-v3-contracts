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

const encodeDfsSellAction = async  (dfsSell, fromToken, toToken, amount, wrapperAddress, from, to) => {
    const abiCoder = new ethers.utils.AbiCoder();

    let firstPath = fromToken;
    let secondPath = toToken;

    if (fromToken.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        firstPath = WETH_ADDRESS;
    }

    if (toToken.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        secondPath = WETH_ADDRESS;
    }

    const path = abiCoder.encode(['address[]'],[[firstPath, secondPath]]);

    const exchangeData = await dfsSell.packExchangeData([
        fromToken, toToken, amount.toString(), 0, 0, 0, nullAddress, wrapperAddress, path,
        [nullAddress, nullAddress, 0, 0, ethers.utils.toUtf8Bytes('')]
    ]);

    const callData = abiCoder.encode(
        ['bytes', 'address', 'address', 'uint8[]'],
        [exchangeData, from, to, []]
    );

    return callData;
};

// TODO: check stuff like price and slippage
// TODO: can we make it work with 0x?

describe("Dfs-Sell", function() {
    let senderAcc, proxy, dfsSell, dfsSellAddr;

    const tokens = [
        {sellToken: "ETH", buyToken: "DAI", amount: "1"},
        {sellToken: "DAI", buyToken: "WBTC", amount: "200"},
        {sellToken: "ETH", buyToken: "USDC", amount: "1"},
        {sellToken: "USDC", buyToken: "ETH", amount: "100"},
        {sellToken: "ETH", buyToken: "USDT", amount: "1"},
        {sellToken: "USDT", buyToken: "BAT", amount: "150"},
    ];

    before(async () => {
        dfsSell = await redeploy('DFSSell');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        dfsSellAddr = await getAddrFromRegistry('DFSSell');

        this.timeout(40000);
    });

    for (let i = 0; i < tokens.length; ++i) {
        const token = tokens[i];

        it(`... should sell ${token.sellToken} for a ${token.buyToken}`, async () => {

            const sellAddr = getAssetInfo(token.sellToken).address;
            const buyAddr = getAssetInfo(token.buyToken).address;

            const amount = token.amount * 10**getAssetInfo(token.sellToken).decimals;
            let value = '0';

            const buyBalanceBefore = await balanceOf(buyAddr, senderAcc.address);

            if (token.sellToken.toLowerCase() === 'eth') {
                value = amount.toString();
            } else {
                await approve(sellAddr, proxy.address);
            }

            if (sellAddr === nullAddress || buyAddr === nullAddress) {
                console.log("Can't find tokens address");
            }

            const callData = await encodeDfsSellAction(
                dfsSell, sellAddr, buyAddr, amount, UNISWAP_WRAPPER, senderAcc.address, senderAcc.address);

            const DfsSell = await ethers.getContractFactory("DFSSell");
            const functionData = DfsSell.interface.encodeFunctionData(
                "executeAction",
                 [0, callData, []]
            );

            await proxy['execute(address,bytes)'](dfsSellAddr, functionData, {value, gasLimit: 1000000});

            const buyBalanceAfter = await balanceOf(buyAddr, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });

    }

});