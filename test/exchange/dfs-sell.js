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
    sell,
} = require('../actions.js');

// TODO: check stuff like price and slippage
// TODO: can we make it work with 0x?

describe('Dfs-Sell', function () {
    this.timeout(40000);

    let senderAcc; let proxy; let uniWrapper; let
        kyberWrapper;

    const trades = [
        { sellToken: 'WETH', buyToken: 'DAI', amount: '1' },
        { sellToken: 'DAI', buyToken: 'WBTC', amount: '200' },
        { sellToken: 'WETH', buyToken: 'USDC', amount: '1' },
        { sellToken: 'USDC', buyToken: 'WETH', amount: '100' },
        { sellToken: 'WETH', buyToken: 'USDT', amount: '1' },
        { sellToken: 'USDT', buyToken: 'BAT', amount: '150' },
    ];

    before(async () => {
        await redeploy('DFSSell');

        uniWrapper = await redeploy('UniswapWrapperV3');
        kyberWrapper = await redeploy('KyberWrapperV3');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
        await setNewExchangeWrapper(senderAcc, kyberWrapper.address);
    });

    for (let i = 0; i < trades.length; ++i) {
        const trade = trades[i];

        it(`... should sell ${trade.sellToken} for a ${trade.buyToken}`, async () => {
            const sellAssetInfo = getAssetInfo(trade.sellToken);
            const buyAssetInfo = getAssetInfo(trade.buyToken);

            const buyBalanceBefore = await balanceOf(buyAssetInfo.address, senderAcc.address);

            const amount = trade.amount * 10 ** getAssetInfo(trade.sellToken).decimals;

            await sell(
                proxy,
                sellAssetInfo.address,
                buyAssetInfo.address,
                amount,
                uniWrapper.address,
                senderAcc.address,
                senderAcc.address,
            );

            const buyBalanceAfter = await balanceOf(buyAssetInfo.address, senderAcc.address);

            expect(buyBalanceBefore).is.lt(buyBalanceAfter);
        });
    }
});
