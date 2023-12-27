const hre = require('hardhat');
const { expect } = require('chai');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy, setBalance, approve, nullAddress, balanceOf,
} = require('../utils');
const { deployMorphoBlueMarket } = require('./morpho-blue-tests');
const { morphoBlueSupply, morphoBlueWithdraw } = require('../actions');

describe('Morpho-Blue-Supply', function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;
    let snapshot;
    let view;
    let marketParams;
    let supplyAmount;
    let withdrawAmount;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        const morphoInfo = await deployMorphoBlueMarket();
        await redeploy('MorphoBlueSupply');
        await redeploy('MorphoBlueWithdraw');
        view = await redeploy('MorphoBlueView');
        marketParams = morphoInfo;
        supplyAmount = hre.ethers.utils.parseUnits('15');
        withdrawAmount = hre.ethers.utils.parseUnits('10');
    });
    after(async () => {
        await revertToSnapshot(snapshot);
    });
    it('should supply to morpho blue ', async () => {
        await setBalance(marketParams[0], senderAcc.address, supplyAmount);
        await approve(marketParams[0], proxy.address, senderAcc);
        await morphoBlueSupply(
            proxy, marketParams, supplyAmount, senderAcc.address, nullAddress,
        );
        const positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
        console.log(positionInfo);
        expect(supplyAmount).to.be.closeTo(positionInfo.suppliedInAssets, 1);
    });
    it('should withdraw a part of the supplied assets from morphoBlue ', async () => {
        await setBalance(marketParams[0], senderAcc.address, hre.ethers.utils.parseUnits('0'));
        await morphoBlueWithdraw(
            proxy, marketParams, withdrawAmount, nullAddress, senderAcc.address,
        );
        const positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
        console.log(positionInfo);
        const userBalance = await balanceOf(marketParams[0], senderAcc.address);
        expect(userBalance).to.be.eq(withdrawAmount);
        expect(supplyAmount.sub(withdrawAmount)).to.be.closeTo(
            positionInfo.suppliedInAssets, 1,
        );
    });
    it('should withdraw all of the supplied assets from morphoBlue ', async () => {
        await setBalance(marketParams[0], senderAcc.address, hre.ethers.utils.parseUnits('0'));
        await morphoBlueWithdraw(
            proxy,
            marketParams,
            hre.ethers.constants.MaxUint256,
            nullAddress,
            senderAcc.address,
        );
        const positionInfo = await view.callStatic.getUserInfo(marketParams, proxy.address);
        console.log(positionInfo);
        const userBalance = await balanceOf(marketParams[0], senderAcc.address);
        expect(userBalance).to.be.closeTo(supplyAmount.sub(withdrawAmount), 1);
        expect(positionInfo.suppliedInAssets).to.be.eq(0);
    });
});
