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
    setBalance,
} = require('../utils');
const { COMP_ADDR } = require('../utils-comp');

describe('CompV3-Claim', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;

    before(async () => {
        await redeploy('CompV3Supply');
        await redeploy('CompV3Claim');
        await redeploy('CompV3Borrow');
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... claim usdc tokens for proxy account', async () => {
        // base min for rewards is 1000000000000
        const amount = hre.ethers.utils.parseUnits('1000', 6);

        const COMET_REWARDS_ADDR = '0x1B0e765F6224C21223AeA2af16c1C46E38885a40';
        const COMET_ADDR = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';

        const abi = [
            'function getRewardOwed(address, address) public view returns(address, uint256)',
        ];

        const CometRewardsContract = new ethers.Contract(COMET_REWARDS_ADDR, abi, senderAcc)

        await setBalance(COMP_ADDR, COMET_REWARDS_ADDR, hre.ethers.utils.parseUnits('1000000000', 18));

        await supplyCompV3(proxy, USDC_ADDR, amount, senderAcc.address);

        await network.provider.send("evm_increaseTime", [36000]);
        await network.provider.send("evm_mine");

        const tx = await CometRewardsContract.callStatic.getRewardOwed(COMET_ADDR, proxy.address)
        console.log(tx.toString())

        const BalanceBefore = await balanceOf(COMP_ADDR, senderAcc.address);
        const BalanceProxyBefore = await balanceOf(COMP_ADDR, proxy.address);

        await claimCompV3(proxy, proxy.address, senderAcc.address, true);

        const BalanceAfter = await balanceOf(COMP_ADDR, senderAcc.address);
        const BalanceProxyAfter = await balanceOf(COMP_ADDR, proxy.address);

        expect(BalanceProxyAfter).to.be.eq(BalanceProxyBefore);
        expect(BalanceAfter).to.be.gt(BalanceBefore);
    });
});
