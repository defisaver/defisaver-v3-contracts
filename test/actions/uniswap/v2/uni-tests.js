const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    balanceOf,
    fetchAmountinUSDPrice,
} = require('../../../utils/utils');

const { getPair } = require('../../../utils/uniswap');

const { uniSupply, uniWithdraw } = require('../../../utils/actions');

const uniSupplyTest = async () => {
    describe('Uni-Supply', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy;

        const uniPairs = [
            { tokenA: 'WETH', tokenB: 'DAI', amount: fetchAmountinUSDPrice('WETH', '3000') },
            { tokenA: 'WETH', tokenB: 'WBTC', amount: fetchAmountinUSDPrice('WETH', '3000') },
            { tokenA: 'DAI', tokenB: 'USDC', amount: fetchAmountinUSDPrice('DAI', '1000') },
        ];

        before(async () => {
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
};

const uniWithdrawTest = async () => {
    // TODO: test when amount == uint.max
    // TODO: test partial withdraw (not whole amount)
    describe('Uni-Withdraw', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy;

        const uniPairs = [
            { tokenA: 'WETH', tokenB: 'DAI', amount: fetchAmountinUSDPrice('WETH', '3000') },
            { tokenA: 'WETH', tokenB: 'WBTC', amount: fetchAmountinUSDPrice('WETH', '3000') },
            { tokenA: 'DAI', tokenB: 'USDC', amount: fetchAmountinUSDPrice('DAI', '1000') },
        ];

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < uniPairs.length; ++i) {
            it(`... should withdraw ${uniPairs[i].tokenA}/${uniPairs[i].tokenB} from uniswap`, async () => {
                const tokenDataA = getAssetInfo(uniPairs[i].tokenA);
                const tokenDataB = getAssetInfo(uniPairs[i].tokenB);

                const to = senderAcc.address;
                const from = senderAcc.address;

                const pairData = await getPair(tokenDataA.address, tokenDataB.address);

                let liquidity = await balanceOf(pairData.pairAddr, senderAcc.address);

                // if we don't have liq. we supply first
                if (liquidity.eq('0')) {
                    await uniSupply(
                        proxy,
                        tokenDataA.address,
                        tokenDataA.decimals,
                        tokenDataB.address,
                        uniPairs[i].amount,
                        from,
                        to,
                    );
                    liquidity = await balanceOf(pairData.pairAddr, senderAcc.address);
                }

                const tokenABalanceBefore = await balanceOf(tokenDataA.address, senderAcc.address);
                const tokenBBalanceBefore = await balanceOf(tokenDataB.address, senderAcc.address);

                await uniWithdraw(
                    proxy,
                    tokenDataA.address,
                    tokenDataB.address,
                    pairData.pairAddr,
                    liquidity,
                    to,
                    from,
                );

                const tokenABalanceAfter = await balanceOf(tokenDataA.address, senderAcc.address);
                const tokenBBalanceAfter = await balanceOf(tokenDataB.address, senderAcc.address);
                const lpBalanceAfter = await balanceOf(pairData.pairAddr, senderAcc.address);

                // TODO: check if we got exact token amount correct not just if bigger

                expect(lpBalanceAfter).to.be.eq(0, 'Should withdraw all the lp tokens');
                expect(tokenABalanceBefore).to.be.lt(tokenABalanceAfter);
                expect(tokenBBalanceBefore).to.be.lt(tokenBBalanceAfter);
            });
        }
    });
};

const uniDeployContracts = async () => {
    await redeploy('UniSupply');
    await redeploy('UniWithdraw');
};
const uniFullTest = async () => {
    await uniDeployContracts();
    await uniSupplyTest();
    await uniWithdrawTest();
};

module.exports = {
    uniFullTest,
    uniSupplyTest,
    uniWithdrawTest,
};
