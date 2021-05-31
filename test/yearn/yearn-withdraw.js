const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    balanceOf,
    fetchAmountinUSDPrice,
    WETH_ADDRESS,
    depositToWeth,
    approve,
    UNISWAP_WRAPPER,
} = require('../utils');

const { yearnSupply, yearnWithdraw, sell } = require('../actions.js');

describe('Yearn-Withdraw', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    const yearnPairs = [
        { name: 'WETH', token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', yToken: '0xe1237aA7f535b0CC33Fd973D66cBf830354D16c7' },
        { name: 'YFI', token: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e', yToken: '0xBA2E7Fed597fd0E3e70f5130BcDbbFE06bB94fe1' },
        { name: '3Crv', token: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490', yToken: '0x9cA85572E6A3EbF24dEDd195623F188735A5179f' },
        { name: 'yDAI+yUSDC+yUSDT+yTUSD', token: '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8', yToken: '0x5dbcF33D8c2E976c6b560249878e6F1491Bca25c' },
        { name: 'DAI', token: '0x6B175474E89094C44Da98b954EedeAC495271d0F', yToken: '0xACd43E627e64355f1861cEC6d3a6688B31a6F952' },
        { name: 'TUSD', token: '0x0000000000085d4780B73119b644AE5ecd22b376', yToken: '0x37d19d1c4E1fa9DC47bD1eA12f742a0887eDa74a' },
        { name: 'USDC', token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', yToken: '0x597aD1e0c13Bfe8025993D9e79C69E1c0233522e' },
        { name: 'USDT', token: '0xdAC17F958D2ee523a2206206994597C13D831ec7', yToken: '0x2f08119C6f07c006695E079AAFc638b8789FAf18' },
    ];

    before(async () => {
        await redeploy('YearnSupply');
        await redeploy('YearnWithdraw');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < yearnPairs.length; i++) {
        it(`... should withdraw ${yearnPairs[i].name} from Yearn`, async () => {
            const token = yearnPairs[i].token;
            const yToken = yearnPairs[i].yToken;
            if (token !== WETH_ADDRESS) {
                await sell(
                    proxy,
                    WETH_ADDRESS,
                    token,
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18),
                    UNISWAP_WRAPPER,
                    senderAcc.address,
                    senderAcc.address,
                );
            } else {
                await depositToWeth(hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), 18));
            }
            await approve(token, proxy.address);
            await yearnSupply(token,
                hre.ethers.constants.MaxUint256,
                senderAcc.address,
                senderAcc.address,
                proxy);

            const tokenAmountStart = await balanceOf(token, senderAcc.address);
            const yTokenAmountStart = await balanceOf(yToken, senderAcc.address);
            const amountToWithdraw = yTokenAmountStart.div(10);
            await approve(yToken, proxy.address);
            await yearnWithdraw(
                yToken,
                amountToWithdraw,
                senderAcc.address,
                senderAcc.address,
                proxy,
            );

            const tokenAmountAfterFirst = await balanceOf(token, senderAcc.address);
            const yTokenAmountAfterFirst = await balanceOf(yToken, senderAcc.address);
            expect(yTokenAmountAfterFirst).to.be.eq(yTokenAmountStart.sub(amountToWithdraw));
            expect(tokenAmountAfterFirst).to.be.gt(tokenAmountStart);

            await yearnWithdraw(
                yToken,
                hre.ethers.constants.MaxUint256,
                senderAcc.address,
                senderAcc.address,
                proxy,
            );

            const tokenAmountEnd = await balanceOf(token, senderAcc.address);
            const yTokenAmountEnd = await balanceOf(yToken, senderAcc.address);
            expect(tokenAmountEnd).to.be.gt(tokenAmountAfterFirst);
            expect(yTokenAmountEnd).to.be.eq(0);
        }).timeout(100000);
    }
});
