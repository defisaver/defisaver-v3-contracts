/* eslint-disable max-len */
/* eslint-disable spaced-comment */
const ethers = require('ethers');
const hre = require('hardhat');
const { expect } = require('chai');
const { supplyCompV3, transferCompV3 } = require('../actions');
const {
    redeploy,
    WETH_ADDRESS,
    fetchAmountinUSDPrice,
    getProxy,
    takeSnapshot,
    revertToSnapshot,
    USDC_ADDR,
    WBTC_ADDR,
    setBalance,
} = require('../utils');
const { getAssetInfo } = require('@defisaver/tokens');

const cometAbi = [
    'function collateralBalanceOf(address account, address asset) external view returns (uint128)',
    'function balanceOf(address account) override public view returns (uint256)',
];
const cometAddress = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';

describe('CompV3-Transfer', function () {
    this.timeout(80000);

    let senderAcc;
    let receiverAcc;
    let proxy;
    let proxy2;
    let snapshot;

    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });

    before(async () => {
        await redeploy('CompV3Supply');
        await redeploy('CompV3Transfer');

        senderAcc = (await hre.ethers.getSigners())[0];
        receiverAcc = (await hre.ethers.getSigners())[1];
        proxy = await getProxy(senderAcc.address);
        proxy2 = await getProxy(receiverAcc.address);
    });

    it('... Transfer WETH', async () => {
        const cometExt = new ethers.Contract(cometAddress, cometAbi, senderAcc);
        const assetInfo = getAssetInfo('WETH');

        const transferingAmount = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice('WETH', '2000'),
            assetInfo.decimals,
        );

        await supplyCompV3(proxy, WETH_ADDRESS, ethers.utils.parseEther('10'), senderAcc.address);

        const senderBalanceBefore = await cometExt.collateralBalanceOf(proxy.address, WETH_ADDRESS);
        const receiverBalanceBefore = await cometExt.collateralBalanceOf(proxy2.address, WETH_ADDRESS);

        await transferCompV3(proxy, proxy.address, proxy2.address, WETH_ADDRESS, transferingAmount);

        const senderBalanceAfter = await cometExt.collateralBalanceOf(proxy.address, WETH_ADDRESS);
        const receiverBalanceAfter = await cometExt.collateralBalanceOf(proxy2.address, WETH_ADDRESS);

        expect(receiverBalanceAfter).to.be.gt(receiverBalanceBefore);
        expect(senderBalanceAfter).to.be.lt(senderBalanceBefore);
    });

    it('... Transfer WBTC', async () => {
        const cometExt = new ethers.Contract(cometAddress, cometAbi, senderAcc);
        const assetInfo = getAssetInfo('WBTC');

        const supplyAmount = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice('WBTC', '3000'),
            assetInfo.decimals,
        );

        const transferingAmount = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice('WBTC', '2000'),
            assetInfo.decimals,
        );

        await setBalance(WBTC_ADDR, senderAcc.address, supplyAmount);

        await supplyCompV3(proxy, WBTC_ADDR, supplyAmount, senderAcc.address);

        const senderBalanceBefore = await cometExt.collateralBalanceOf(proxy.address, WBTC_ADDR);
        const receiverBalanceBefore = await cometExt.collateralBalanceOf(proxy2.address, WBTC_ADDR);

        await transferCompV3(proxy, proxy.address, proxy2.address, WBTC_ADDR, transferingAmount);

        const senderBalanceAfter = await cometExt.collateralBalanceOf(proxy.address, WBTC_ADDR);
        const receiverBalanceAfter = await cometExt.collateralBalanceOf(proxy2.address, WBTC_ADDR);

        expect(receiverBalanceAfter).to.be.gt(receiverBalanceBefore);
        expect(senderBalanceAfter).to.be.lt(senderBalanceBefore);
    });

    it('... Transfer USDC', async () => {
        const cometExt = new ethers.Contract(cometAddress, cometAbi, senderAcc);
        const assetInfo = getAssetInfo('USDC');

        const supplyAmount = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice('USDC', '3000'),
            assetInfo.decimals,
        );

        const transferingAmount = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice('USDC', '2000'),
            assetInfo.decimals,
        );

        await setBalance(USDC_ADDR, senderAcc.address, supplyAmount);

        await supplyCompV3(proxy, USDC_ADDR, supplyAmount, senderAcc.address);

        const senderBalanceBefore = await cometExt.balanceOf(proxy.address);
        const receiverBalanceBefore = await cometExt.balanceOf(proxy2.address);

        await transferCompV3(proxy, proxy.address, proxy2.address, USDC_ADDR, transferingAmount);

        const senderBalanceAfter = await cometExt.balanceOf(proxy.address);
        const receiverBalanceAfter = await cometExt.balanceOf(proxy2.address);

        expect(receiverBalanceAfter).to.be.gt(receiverBalanceBefore);
        expect(senderBalanceAfter).to.be.lt(senderBalanceBefore);
    });
});
