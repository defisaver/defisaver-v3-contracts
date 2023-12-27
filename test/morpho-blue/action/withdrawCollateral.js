const hre = require('hardhat');
const { expect } = require('chai');
const {
    takeSnapshot, revertToSnapshot, getProxy,
    setBalance, approve, nullAddress, redeploy, balanceOf,
} = require('../../utils');
const { morphoBlueSupplyCollateral, morphoBlueWithdrawCollateral } = require('../../actions');
const { getMarketParams } = require('../utils');

describe('Morpho-Blue-Supply-Collateral', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;
    let snapshot;
    let view;
    let marketParams;
    let supplyAmount;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        marketParams = await getMarketParams();
        await redeploy('MorphoBlueSupplyCollateral');
        await redeploy('MorphoBlueWithdrawCollateral');
        view = await redeploy('MorphoBlueView');
        supplyAmount = hre.ethers.utils.parseUnits('15');
    });
    after(async () => {
        await revertToSnapshot(snapshot);
    });
    it('should supply collateral to morpho blue ', async () => {
        await setBalance(marketParams[1], senderAcc.address, supplyAmount);
        await approve(marketParams[1], proxy.address, senderAcc);
        await morphoBlueSupplyCollateral(
            proxy, marketParams, supplyAmount, senderAcc.address, nullAddress,
        );
        const positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
        expect(supplyAmount).to.be.eq(positionInfo.collateral);
    });
    it('should withdraw collateral from morpho blue ', async () => {
        await setBalance(marketParams[1], senderAcc.address, hre.ethers.utils.parseUnits('0'));
        await morphoBlueWithdrawCollateral(
            proxy, marketParams, supplyAmount, nullAddress, senderAcc.address,
        );
        const positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
        const eoaBalance = await balanceOf(marketParams[1], senderAcc.address);
        expect(supplyAmount).to.be.eq(eoaBalance);
        expect(positionInfo.collateral).to.be.eq(0);
    });
});
