const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
    setNewExchangeWrapper,
} = require('../utils');

const {
    buy,
} = require('../actions.js');

// TODO: check stuff like price and slippage
// TODO: can we make it work with 0x?

describe('Dfs-Buy', function () {
    this.timeout(40000);

    let senderAcc; let proxy; let uniWrapper; let
        kyberWrapper;

    const trades = [
        {
            sellToken: 'WETH', buyToken: 'DAI', sellAmount: '5', buyAmount: '2000',
        },
        {
            sellToken: 'DAI', buyToken: 'WBTC', sellAmount: '1000', buyAmount: '0.001',
        },
        {
            sellToken: 'WETH', buyToken: 'USDC', sellAmount: '1', buyAmount: '1000',
        },
        {
            sellToken: 'USDC', buyToken: 'WETH', sellAmount: '400', buyAmount: '0.1',
        },
        {
            sellToken: 'WETH', buyToken: 'USDT', sellAmount: '1', buyAmount: '1000',
        },
        {
            sellToken: 'USDT', buyToken: 'BAT', sellAmount: '550', buyAmount: '20',
        },
    ];

    before(async () => {
        await redeploy('DFSBuy');
        uniWrapper = await redeploy('UniswapWrapperV3');
        kyberWrapper = await redeploy('KyberWrapperV3');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
        await setNewExchangeWrapper(senderAcc, kyberWrapper.address);
    });

    for (let i = 0; i < trades.length; ++i) {
        const trade = trades[i];

        it(`... should buy ${trade.buyAmount} ${trade.buyToken} with ${trade.sellToken}`, async () => {
            const sellAddr = getAssetInfo(trade.sellToken).address;
            const buyAddr = getAssetInfo(trade.buyToken).address;

            const buyBalanceBefore = await balanceOf(buyAddr, senderAcc.address);
            const proxySellBalanceBefore = await balanceOf(sellAddr, proxy.address);
            const proxyBuyBalanceBefore = await balanceOf(buyAddr, proxy.address);

            const sellAmount = hre.ethers.utils.parseUnits(
                trade.sellAmount,
                getAssetInfo(trade.sellToken).decimals,
            );
            const buyAmount = hre.ethers.utils.parseUnits(
                trade.buyAmount,
                getAssetInfo(trade.buyToken).decimals,
            );

            await buy(
                proxy,
                sellAddr,
                buyAddr,
                sellAmount,
                buyAmount,
                kyberWrapper.address,
                senderAcc.address,
                senderAcc.address,
            );

            const buyBalanceAfter = await balanceOf(buyAddr, senderAcc.address);
            const proxySellBalanceAfter = await balanceOf(sellAddr, proxy.address);
            const proxyBuyBalanceAfter = await balanceOf(buyAddr, proxy.address);

            expect(proxyBuyBalanceBefore).to.be.eq(proxyBuyBalanceAfter, 'Check if we left over buy token on proxy');
            expect(proxySellBalanceBefore).to.be.eq(proxySellBalanceAfter, 'Check if we left over sell token on proxy');

            // because of the eth gas fee
            if (getAssetInfo(trade.buyToken).symbol !== 'ETH') {
                expect(buyBalanceBefore.add(buyAmount)).is.eq(buyBalanceAfter, 'Check if we got that exact amount');
            } else {
                expect(buyBalanceAfter).is.gt(buyBalanceBefore, 'Check if we got that exact amount');
            }
        });
    }
});
