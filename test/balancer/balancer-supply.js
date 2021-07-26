const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    approve,
    balanceOf,
} = require('../utils');
const { balancerSupply, buyTokenIfNeeded } = require('../actions.js');

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
            tokens: [getAssetInfo('USDT').address, getAssetInfo('USDC').address, getAssetInfo('DAI').address],
            amountsIn: [
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('USDT', '10000'), getAssetInfo('USDT').decimals),
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('USDC', '10000'), getAssetInfo('USDC').decimals),
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('DAI', '10000'), getAssetInfo('DAI').decimals),
            ],
            poolAddress: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42',
        },
        {
            poolId: '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e',
            tokens: [getAssetInfo('WBTC').address, getAssetInfo('WETH').address],
            amountsIn: [
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WBTC', '10000'), getAssetInfo('WBTC').decimals),
                hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), getAssetInfo('WETH').decimals),
            ],
            poolAddress: '0xa6f548df93de924d73be7d25dc02554c6bd66db5',
        },
    ];

    before(async () => {
        await redeploy('BalancerV2Supply');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        from = senderAcc.address;
        to = senderAcc.address;
    });
    for (let i = 0; i < 1; i++) {
        i = 1;
        it('... supply', async () => {
            console.log(balancerPairs[i].tokens);
            for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                // eslint-disable-next-line no-await-in-loop
                await buyTokenIfNeeded(
                    balancerPairs[i].tokens[j],
                    senderAcc,
                    proxy,
                    balancerPairs[i].amountsIn[j],
                );
                // eslint-disable-next-line no-await-in-loop
                await approve(balancerPairs[i].tokens[j], proxy.address);
            }
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
            const lpTokenBalance = await balanceOf(balancerPairs[i].poolAddress, to);
            console.log(lpTokenBalance.toString());
        }).timeout(50000);
    }
});
