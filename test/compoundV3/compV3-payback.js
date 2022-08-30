/* eslint-disable spaced-comment */
const ethers = require('ethers');
const hre = require('hardhat');
const { expect } = require('chai');
const { paybackCompV3, borrowCompV3, supplyCompV3 } = require('../actions');
const {
    redeploy,
    WETH_ADDRESS,
    balanceOf,
    fetchAmountinUSDPrice,
    getProxy,
    takeSnapshot,
    revertToSnapshot,
} = require('../utils');
const { getAssetInfo } = require('@defisaver/tokens');

const cometAbi = [
    'function borrowBalanceOf(address account) public view returns (uint256)',
];
const cometAddress = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';

describe('CompV3-Payback', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;
    let snapshot;

    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });

    before(async () => {
        await redeploy('CompV3Supply');
        await redeploy('CompV3Borrow');
        await redeploy('CompV3Payback');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... Payback everything owed', async () => {
        const comet = new ethers.Contract(cometAddress, cometAbi, senderAcc);

        const assetInfo = getAssetInfo('USDC');

        const borrowingAmount = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice('USDC', '10000'),
            assetInfo.decimals,
        );

        await supplyCompV3(proxy, WETH_ADDRESS, ethers.utils.parseEther('15'), senderAcc.address);

        await borrowCompV3(proxy, borrowingAmount, senderAcc.address);

        const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);
        const borrowBalanceBefore = await comet.borrowBalanceOf(proxy.address);

        await paybackCompV3(proxy, borrowingAmount, senderAcc.address, proxy.address);

        const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
        const borrowBalanceAfter = await comet.borrowBalanceOf(proxy.address);

        expect(balanceBefore).to.be.gt(balanceAfter);
        expect(balanceAfter).to.be.eq(0);
        expect(borrowBalanceBefore).to.be.gt(borrowBalanceAfter);
        expect(balanceAfter).to.not.be.eq(borrowBalanceAfter);
    });
});
