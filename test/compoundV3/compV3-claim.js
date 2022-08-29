const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const { supplyCompV3, claimCompV3, borrowCompV3 } = require('../actions');
const {
    redeploy,
    USDC_ADDR,
    balanceOf,
    getProxy,
    WETH_ADDRESS,
    send,
} = require('../utils');
const { COMP_ADDR } = require('../utils-comp');

describe('CompV3-Claim', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;

    before(async () => {
        await redeploy('CompV3Supply');
        await redeploy('CompV3Claim');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... claim usdc tokens for proxy account', async () => {

        // base min for rewards is 1000000000000
        const amount = hre.ethers.utils.parseUnits('10', 18);

        await supplyCompV3(proxy, WETH_ADDRESS, amount, senderAcc.address);

        const BalanceBefore = await balanceOf(COMP_ADDR, senderAcc.address);
        const BalanceProxyBefore = await balanceOf(COMP_ADDR, proxy.address);

        // const COMET_REWARDS_ADDR = '0x1B0e765F6224C21223AeA2af16c1C46E38885a40';
        // await send(COMP_ADDR, COMET_REWARDS_ADDR, hre.ethers.utils.parseUnits('10', 18));

        await claimCompV3(proxy, proxy.address, senderAcc.address, false);

        const BalanceAfter = await balanceOf(COMP_ADDR, senderAcc.address);
        const BalanceProxyAfter = await balanceOf(COMP_ADDR, proxy.address);

        expect(BalanceProxyAfter).to.be.eq(BalanceProxyBefore);
        expect(BalanceAfter).to.be.gte(BalanceBefore);
    });
});
