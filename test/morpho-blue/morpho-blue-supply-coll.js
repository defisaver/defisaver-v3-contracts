const hre = require('hardhat');
const { expect } = require('chai');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy, setBalance, approve, nullAddress,
} = require('../utils');
const { deployMorphoBlueMarket } = require('./morpho-blue-tests');
const { morphoBlueSupplyCollateral } = require('../actions');

describe('Morpho-Blue-Supply-Collateral', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;
    let snapshot;
    let view;
    let marketParams;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        const morphoInfo = await deployMorphoBlueMarket();
        await redeploy('MorphoBlueSupplyCollateral');
        view = await redeploy('MorphoBlueView');
        marketParams = morphoInfo;
    });
    after(async () => {
        await revertToSnapshot(snapshot);
    });
    it('should supply collateral to morpho blue ', async () => {
        const supplyAmount = hre.ethers.utils.parseUnits('15');
        await setBalance(marketParams[1], senderAcc.address, supplyAmount);
        await approve(marketParams[1], proxy.address, senderAcc);
        await morphoBlueSupplyCollateral(
            proxy, marketParams, supplyAmount, senderAcc.address, nullAddress,
        );
        const positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
        expect(supplyAmount).to.be.eq(positionInfo.collateral);
    });
});
