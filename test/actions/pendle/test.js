const { expect } = require('chai');
const hre = require('hardhat');
const {
    resetForkToBlock,
    redeploy,
    impersonateAccount,
    sendEther,
    balanceOf,
    toBytes32,
    isNetworkFork,
    takeSnapshot,
    revertToSnapshot,
    getOwnerAddr,
    setBalance,
} = require('../../utils/utils');
const { topUp } = require('../../../scripts/utils/fork');

describe('Test Pendle Integration', function () {
    this.timeout(1000000);

    const ptHolder = '0x69D1Bbd881817795811E3E2973716ddc98Bfe9b2';
    const underlyingHolder = '0x0ad1763dddd2aa9284b3828c19eed0a1960f362b';
    const ptTokenAddr = '0x50d2c7992b802eef16c04feadab310f31866a545';
    const underlyingTokenAddr = '0x90d2af7d622ca3141efa4d8f1f24d86e5974cc8f';
    const pendleRouterAddr = '0x888888888889758f76e7103c6cbf23abbf58f946';

    before(async () => {
        await topUp(ptHolder);
        await topUp(underlyingHolder);

        const underlyingToken = await hre.ethers.getContractAt('IERC20', underlyingTokenAddr);
        const underlyingHolderAcc = await hre.ethers.provider.getSigner(underlyingHolder);
        await underlyingToken.connect(underlyingHolderAcc).approve(pendleRouterAddr, hre.ethers.utils.parseEther('10000'));

        const ptToken = await hre.ethers.getContractAt('IERC20', ptTokenAddr);
        const ptHolderAcc = await hre.ethers.provider.getSigner(ptHolder);
        await ptToken.connect(ptHolderAcc).approve(pendleRouterAddr, hre.ethers.utils.parseEther('10000'));
    });

    it('...', async () => {
    });
});
