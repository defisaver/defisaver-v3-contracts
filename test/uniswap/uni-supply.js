const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
} = require('../utils');

const { getPair } = require('../utils-uni.js');

const { uniSupply } = require('../actions.js');

describe('Uni-Supply', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    // TODO: Amount should be dynamic?
    const uniPairs = [
        { tokenA: 'WETH', tokenB: 'DAI', amount: '1' },
        { tokenA: 'WETH', tokenB: 'WBTC', amount: '1' },
        { tokenA: 'DAI', tokenB: 'USDC', amount: '500' },
    ];

    before(async () => {
        await redeploy('UniSupply');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < uniPairs.length; ++i) {
        it(`... should supply ${uniPairs[i].tokenA}/${uniPairs[i].tokenB} to uniswap`, async () => {
            const tokenDataA = getAssetInfo(uniPairs[i].tokenA);
            const tokenDataB = getAssetInfo(uniPairs[i].tokenB);

            const from = senderAcc.address;
            const to = senderAcc.address;

            const pairData = await getPair(tokenDataA.address, tokenDataB.address);

            const lpBalanceBefore = await balanceOf(pairData.pairAddr, senderAcc.address);

            await uniSupply(
                proxy,
                tokenDataA.address,
                tokenDataA.decimals,
                tokenDataB.address,
                uniPairs[i].amount,
                from,
                to,
            );

            const lpBalanceAfter = await balanceOf(pairData.pairAddr, senderAcc.address);

            // TODO: check if we got the correct amount of lp tokens

            expect(lpBalanceAfter).to.be.gt(lpBalanceBefore, 'Check if we got back the lp tokens');
        });
    }
});
