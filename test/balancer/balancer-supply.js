/* eslint-disable no-await-in-loop */
const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    approve,
    balanceOf,
    setBalance,
} = require('../utils');
const { balancerSupply } = require('../actions.js');

describe('Balancer-Supply', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy; let from; let to;

    const balancerPairs = [
        {
            poolId: '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e',
            tokens: [getAssetInfo('WBTC').address, getAssetInfo('WETH').address],
            amountsIn: [
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WBTC', '10000'), getAssetInfo('WBTC').decimals),
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), getAssetInfo('WETH').decimals),
            ],
            poolAddress: '0xa6f548df93de924d73be7d25dc02554c6bd66db5',

        },
        {
            poolId: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063',
            tokens: [getAssetInfo('DAI').address, getAssetInfo('USDC').address, getAssetInfo('USDT').address],
            amountsIn: [
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('DAI', '10000'), getAssetInfo('DAI').decimals),
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('USDC', '10000'), getAssetInfo('USDC').decimals),
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('USDT', '10000'), getAssetInfo('USDT').decimals),
            ],
            poolAddress: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42',
        },
        {
            poolId: '0xaac98ee71d4f8a156b6abaa6844cdb7789d086ce00020000000000000000001b',
            tokens: [getAssetInfo('MKR').address, getAssetInfo('WETH').address],
            amountsIn: [
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('MKR', '12000'), getAssetInfo('MKR').decimals),
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '8000'), getAssetInfo('WETH').decimals),
            ],
            poolAddress: '0xaac98ee71d4f8a156b6abaa6844cdb7789d086ce',
        },
    ];

    before(async () => {
        await redeploy('BalancerV2Supply');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        from = senderAcc.address;
        to = senderAcc.address;
    });
    for (let i = 0; i < balancerPairs.length; i++) {
        it('... supply exact tokens for LP tokens', async () => {
            const lpTokenBalanceBefore = await balanceOf(balancerPairs[i].poolAddress, to);
            console.log(balancerPairs[i].tokens);
            const proxyBalanceAmounts = [];
            for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                proxyBalanceAmounts.push(
                    await balanceOf(balancerPairs[i].tokens[j], proxy.address),
                );
                await setBalance(
                    balancerPairs[i].tokens[j],
                    senderAcc.address,
                    balancerPairs[i].amountsIn[j],
                );
                await approve(balancerPairs[i].tokens[j], proxy.address);
            }
            // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/balancer-js/src/pool-weighted/encoder.ts
            // joinExactTokensInForBPTOut - minimum of LP tokens set to 0
            const userData = hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [1, balancerPairs[i].amountsIn, 0]);
            await balancerSupply(
                proxy,
                balancerPairs[i].poolId,
                from,
                to,
                balancerPairs[i].tokens,
                balancerPairs[i].amountsIn,
                userData,
            );
            const lpTokenBalanceAfter = await balanceOf(balancerPairs[i].poolAddress, to);
            const lpTokenDiff = lpTokenBalanceAfter.sub(lpTokenBalanceBefore);
            console.log(lpTokenDiff.toString());
            expect(lpTokenDiff).to.be.gt(0);
            for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                expect(
                    await balanceOf(balancerPairs[i].tokens[j], proxy.address),
                ).to.be.eq(proxyBalanceAmounts[j]);
            }
        }).timeout(50000);

        it('... supply only first token for LP tokens', async () => {
            const lpTokenBalanceBefore = await balanceOf(balancerPairs[i].poolAddress, to);
            const proxyBalanceAmounts = [];
            for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                proxyBalanceAmounts.push(
                    await balanceOf(balancerPairs[i].tokens[j], proxy.address),
                );
                await setBalance(
                    balancerPairs[i].tokens[j],
                    senderAcc.address,
                    balancerPairs[i].amountsIn[j],
                );
                await approve(balancerPairs[i].tokens[j], proxy.address);
            }
            const lpAmountRequested = '191590522564772777';
            // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/balancer-js/src/pool-weighted/encoder.ts
            // joinTokenInForExactBPTOut - send only first token for exact LP tokens
            const userData = hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [2, lpAmountRequested, 0]);
            await balancerSupply(
                proxy,
                balancerPairs[i].poolId,
                from,
                to,
                balancerPairs[i].tokens,
                balancerPairs[i].amountsIn,
                userData,
            );
            const lpTokenBalanceAfter = await balanceOf(balancerPairs[i].poolAddress, to);
            const lpTokenDiff = lpTokenBalanceAfter.sub(lpTokenBalanceBefore);
            expect(lpTokenDiff).to.be.eq(lpAmountRequested);

            for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                expect(
                    await balanceOf(balancerPairs[i].tokens[j], proxy.address),
                ).to.be.eq(proxyBalanceAmounts[j]);
            }
        }).timeout(50000);
    }
});
