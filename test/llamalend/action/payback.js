const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, fetchAmountinUSDPrice, nullAddress, balanceOf,
} = require('../../utils');
const {
    getControllers, collateralSupplyAmountInUsd, borrowAmountInUsd, supplyToMarket, getActiveBand,
} = require('../utils');
const { llamalendCreate, llamalendPayback } = require('../../actions');

describe('LlamaLend-Payback', function () {
    this.timeout(80000);

    const controllers = getControllers();

    let senderAcc; let proxy; let snapshot; let view;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('LlamaLendCreate');
        await redeploy('LlamaLendPayback');
        view = await (await hre.ethers.getContractFactory('LlamaLendView')).deploy();
    });
    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });
    for (let i = 0; i < controllers.length; i++) {
        const controllerAddr = controllers[i];
        it(`should create and payback debt partially to a Llamalend position in ${controllerAddr} Llamalend market`, async () => {
            await supplyToMarket(controllerAddr);
            const controller = await hre.ethers.getContractAt('ILlamaLendController', controllerAddr);
            const collTokenAddr = await controller.collateral_token();
            const debtTokenAddr = await controller.borrowed_token();
            const collToken = getAssetInfoByAddress(collTokenAddr);
            const debtToken = getAssetInfoByAddress(debtTokenAddr);
            const supplyAmount = fetchAmountinUSDPrice(
                collToken.symbol, collateralSupplyAmountInUsd,
            );
            const borrowAmount = fetchAmountinUSDPrice(
                debtToken.symbol, borrowAmountInUsd,
            );
            const supplyAmountInWei = hre.ethers.utils.parseUnits(
                supplyAmount, collToken.decimals,
            );
            const borrowAmountWei = hre.ethers.utils.parseUnits(
                borrowAmount, debtToken.decimals,
            );
            await setBalance(collTokenAddr, senderAcc.address, supplyAmountInWei);
            await approve(collTokenAddr, proxy.address, senderAcc);
            await llamalendCreate(
                proxy, controllerAddr, senderAcc.address, senderAcc.address,
                supplyAmountInWei, borrowAmountWei, 10,
            );
            const positionInfoBeforeSupply = await view.callStatic.userData(
                controllerAddr, proxy.address,
            );
            await setBalance(debtTokenAddr, senderAcc.address, borrowAmountWei.div(10));
            await approve(debtTokenAddr, proxy.address, senderAcc);
            const maxActiveBand = await getActiveBand(controllerAddr);
            // eslint-disable-next-line max-len
            await llamalendPayback(proxy, controllerAddr, senderAcc.address, nullAddress, senderAcc.address, borrowAmountWei.div(10), maxActiveBand);
            const positionInfoAfterSupply = await view.callStatic.userData(
                controllerAddr, proxy.address,
            );
            console.log(positionInfoAfterSupply.collRatio / 1e18);
            // here we expect that debt has risen maximally 0.001% from interest
            // eslint-disable-next-line max-len
            expect(positionInfoBeforeSupply.debtAmount.sub(positionInfoAfterSupply.debtAmount)).to.be.closeTo(borrowAmountWei.div(10), borrowAmountWei.div(1e5));
        });
        it(`should create and payback debt fully to a Llamalend position in ${controllerAddr} Llamalend market`, async () => {
            await supplyToMarket(controllerAddr);
            const controller = await hre.ethers.getContractAt('ILlamaLendController', controllerAddr);
            const collTokenAddr = await controller.collateral_token();
            const debtTokenAddr = await controller.borrowed_token();
            const collToken = getAssetInfoByAddress(collTokenAddr);
            const debtToken = getAssetInfoByAddress(debtTokenAddr);
            const supplyAmount = fetchAmountinUSDPrice(
                collToken.symbol, collateralSupplyAmountInUsd,
            );
            const borrowAmount = fetchAmountinUSDPrice(
                debtToken.symbol, borrowAmountInUsd,
            );
            const supplyAmountInWei = hre.ethers.utils.parseUnits(
                supplyAmount, collToken.decimals,
            );
            const borrowAmountWei = hre.ethers.utils.parseUnits(
                borrowAmount, debtToken.decimals,
            );
            await setBalance(collTokenAddr, senderAcc.address, supplyAmountInWei);
            await approve(collTokenAddr, proxy.address, senderAcc);
            await llamalendCreate(
                proxy, controllerAddr, senderAcc.address, senderAcc.address,
                supplyAmountInWei, borrowAmountWei, 10,
            );
            const positionInfoBeforeSupply = await view.callStatic.userData(
                controllerAddr, proxy.address,
            );
            await setBalance(debtTokenAddr, senderAcc.address, borrowAmountWei.mul(101).div(100));
            await approve(debtTokenAddr, proxy.address, senderAcc);
            const maxActiveBand = await getActiveBand(controllerAddr);
            // eslint-disable-next-line max-len
            await llamalendPayback(proxy, controllerAddr, senderAcc.address, nullAddress, senderAcc.address, borrowAmountWei.mul(101).div(100), maxActiveBand);
            const positionInfoAfterSupply = await view.callStatic.userData(
                controllerAddr, proxy.address,
            );
            expect(positionInfoAfterSupply.collRatio).to.be.eq(0);
            const proxyCollTokenBalanceAfterPayback = await balanceOf(collTokenAddr, proxy.address);
            const proxyDebtTokenBalanceAfterPayback = await balanceOf(debtTokenAddr, proxy.address);
            expect(proxyCollTokenBalanceAfterPayback).to.be.eq(0);
            expect(proxyDebtTokenBalanceAfterPayback).to.be.eq(0);
            const senderCollateralBalanceAfterMaxPayback = await balanceOf(
                collTokenAddr, senderAcc.address,
            );
            expect(senderCollateralBalanceAfterMaxPayback).to.be.closeTo(supplyAmountInWei, 10);
            const senderDebtTokenBalanceAfterMaxPayback = await balanceOf(
                debtTokenAddr, senderAcc.address,
            );
            // eslint-disable-next-line max-len
            expect(borrowAmountWei.mul(101).div(100).sub(positionInfoBeforeSupply.debtAmount)).to.be.closeTo(senderDebtTokenBalanceAfterMaxPayback, borrowAmountWei.div(1e5));
        });
    }
});
