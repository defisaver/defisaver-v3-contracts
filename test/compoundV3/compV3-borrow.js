/* eslint-disable no-await-in-loop */
const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');
const ethers = require('ethers');
const { borrowCompV3, supplyCompV3 } = require('../actions');
const {
    fetchAmountinUSDPrice,
    balanceOf,
    redeploy,
    getProxy,
    WETH_ADDRESS,
} = require('../utils');

describe('CompV3-Borrow', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;

    before(async () => {
        await redeploy('CompV3Supply');
        await redeploy('CompV3Borrow');
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should test CompoundV3 borrow', async () => {
        const assetInfo = getAssetInfo('USDC');

        const borrowingAmount = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice('USDC', '2000'),
            assetInfo.decimals,
        );

        await supplyCompV3(proxy, WETH_ADDRESS, ethers.utils.parseEther('10'), senderAcc.address);

        const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

        await borrowCompV3(proxy, borrowingAmount, senderAcc.address);

        const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);

        expect(balanceAfter).to.be.gt(balanceBefore);
    });
});
