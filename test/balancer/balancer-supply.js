const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    depositToWeth,
    approve,
    balanceOf,
} = require('../utils');
const { balancerSupply, buyTokenIfNeeded } = require('../actions.js');

describe('Balancer-Supply', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {
        await redeploy('BalancerV2Supply');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... supply', async () => {
        const poolId = '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e';
        const from = senderAcc.address;
        const to = senderAcc.address;
        const tokens = [getAssetInfo('WBTC').address, getAssetInfo('WETH').address];
        const wbtcAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WBTC', '10000'), getAssetInfo('WBTC').decimals);
        const wethAmount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), getAssetInfo('WETH').decimals);
        await buyTokenIfNeeded(getAssetInfo('WBTC').address, senderAcc, proxy, wbtcAmount);
        await approve((getAssetInfo('WBTC').address), proxy.address);
        await approve((getAssetInfo('WETH').address), proxy.address);
        await depositToWeth(wethAmount);

        const maxAmountsIn = [wbtcAmount, wethAmount];
        const userData = hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [1, maxAmountsIn, 0]);
        await balancerSupply(proxy, poolId, from, to, tokens, maxAmountsIn, userData);
        const lpTokenBalance = await balanceOf('0xa6f548df93de924d73be7d25dc02554c6bd66db5', to);
        console.log(lpTokenBalance.toString());
    }).timeout(50000);
});
