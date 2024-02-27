const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, fetchAmountinUSDPrice, balanceOf,
} = require('../../utils');
const {
    getControllers, collateralSupplyAmountInUsd, borrowAmountInUsd, supplyToMarket,
} = require('../utils');
const { llamalendCreate, llamalendBorrow } = require('../../actions');

describe('LlamaLend-Borrow', function () {
    this.timeout(80000);

    const controllers = getControllers();

    let senderAcc; let proxy; let snapshot; let view;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('LlamaLendCreate');
        await redeploy('LlamaLendBorrow');
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
        it(`should create and borrow from a Llamalend position in ${controllerAddr} Llamalend market`, async () => {
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

            const debtTokenBalanceBefore = await balanceOf(debtTokenAddr, senderAcc.address);
            await llamalendBorrow(
                proxy, controllerAddr, senderAcc.address, borrowAmountWei.div(10),
            );
            const debtTokenBalanceAfter = await balanceOf(debtTokenAddr, senderAcc.address);
            // eslint-disable-next-line max-len
            expect(debtTokenBalanceAfter.sub(debtTokenBalanceBefore)).to.be.eq(borrowAmountWei.div(10));
            const positionInfoAfterBorrow = await view.callStatic.userData(
                controllerAddr, proxy.address,
            );
            console.log(positionInfoAfterBorrow.collRatio / 1e18);
        });
    }
});
