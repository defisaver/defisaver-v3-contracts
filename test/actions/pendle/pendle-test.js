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

    const ptHolder = '0xd9DC80e4ca0d86cfE0ee4F76fd2F10F24bD07307';
    const underlyingHolder = '0x0ad1763dddd2aa9284b3828c19eed0a1960f362b';

    const ptTokenAddr = '0x50d2c7992b802eef16c04feadab310f31866a545';
    const underlyingTokenAddr = '0x90d2af7d622ca3141efa4d8f1f24d86e5974cc8f';
    const pendleRouterAddr = '0x888888888889758f76e7103c6cbf23abbf58f946';

    before(async () => {
        // await topUp(ptHolder);
        // await topUp(underlyingHolder);

        // const underlyingToken = await hre.ethers.getContractAt('IERC20', underlyingTokenAddr);
        // const underlyingHolderAcc = await hre.ethers.provider.getSigner(underlyingHolder);
        // await underlyingToken.connect(underlyingHolderAcc).approve(pendleRouterAddr, hre.ethers.utils.parseEther('10000'));

        // const ptToken = await hre.ethers.getContractAt('IERC20', ptTokenAddr);
        // const ptHolderAcc = await hre.ethers.provider.getSigner(ptHolder);
        // await ptToken.connect(ptHolderAcc).approve(pendleRouterAddr, hre.ethers.utils.parseEther('10000'));

        const aUSDCPtTokenAddr = '0xea1180804bdba8ac04e2a4406b11fb7970c474f1';
        const aUSDCHolder = '0x9a959B9ee2847a66A5A3d43Fd1Ec38a4f0777503';
        await topUp(aUSDCHolder);
        await setBalance(aUSDCPtTokenAddr, aUSDCHolder, hre.ethers.utils.parseUnits('720000', 6));
        const ptUsdcToken = await hre.ethers.getContractAt('IERC20', aUSDCPtTokenAddr);
        const ptUsdcHolderAcc = await hre.ethers.provider.getSigner(aUSDCHolder);
        await ptUsdcToken.connect(ptUsdcHolderAcc).approve(pendleRouterAddr, hre.ethers.utils.parseEther('10000'));
    });

    it('...', async () => {
    });
});
