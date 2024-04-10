const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, fetchAmountinUSDPrice,
    formatMockExchangeObj,
    setNewExchangeWrapper,
    balanceOf,
} = require('../../utils');
const {
    getControllers, collateralSupplyAmountInUsd, borrowAmountInUsd, supplyToMarket,
} = require('../utils');
const { llamalendCreate, llamalendRepay } = require('../../actions');

describe('LlamaLend-Create', function () {
    this.timeout(80000);

    const controllers = getControllers();

    let senderAcc; let proxy; let snapshot; let view; let mockWrapper;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await redeploy('LlamaLendCreate');
        await redeploy('LlamaLendRepay');
        await redeploy('LlamaLendSwapper');
        mockWrapper = await redeploy('MockExchangeWrapper');
        await setNewExchangeWrapper(senderAcc, mockWrapper.address);
        view = await (await hre.ethers.getContractFactory('LlamaLendView')).deploy();
    });
    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });
    for (let i = 0; i < 1; i++) {
        const controllerAddr = controllers[i];
        it(`should create a Llamalend position and then repay it partially in ${controllerAddr} Llamalend market`, async () => {
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
            const supplyAmountInWei = (hre.ethers.utils.parseUnits(
                supplyAmount, collToken.decimals,
            ));
            const borrowAmountWei = hre.ethers.utils.parseUnits(
                borrowAmount, debtToken.decimals,
            );

            await setBalance(collTokenAddr, senderAcc.address, supplyAmountInWei);
            await approve(collTokenAddr, proxy.address, senderAcc);
            await llamalendCreate(
                proxy, controllerAddr, senderAcc.address, senderAcc.address,
                supplyAmountInWei, borrowAmountWei, 10,
            );

            const exchangeData = await formatMockExchangeObj(
                collToken,
                debtToken,
                supplyAmountInWei.div(2),
            );
            const infoBeforeBoost = await view.callStatic.userData(controllerAddr, proxy.address);
            console.log(infoBeforeBoost.collRatio / 1e18);
            await llamalendRepay(
                proxy,
                controllerAddr,
                exchangeData,
                senderAcc.address,
            );
            const infoAfterBoost = await view.callStatic.userData(controllerAddr, proxy.address);
            console.log(infoAfterBoost.collRatio / 1e18);
            expect(infoAfterBoost.collRatio).to.be.gt(infoBeforeBoost.collRatio);
            expect(infoAfterBoost.debtAmount).to.be.lt(infoBeforeBoost.debtAmount);
            // eslint-disable-next-line max-len
            expect(infoAfterBoost.marketCollateralAmount).to.be.lt(infoBeforeBoost.marketCollateralAmount);
        });
        it(`should create a Llamalend position and then repay it fully in ${controllerAddr} Llamalend market`, async () => {
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
            const supplyAmountInWei = (hre.ethers.utils.parseUnits(
                supplyAmount, collToken.decimals,
            ));
            const borrowAmountWei = hre.ethers.utils.parseUnits(
                borrowAmount, debtToken.decimals,
            );

            await setBalance(collTokenAddr, senderAcc.address, supplyAmountInWei);
            await approve(collTokenAddr, proxy.address, senderAcc);
            await llamalendCreate(
                proxy, controllerAddr, senderAcc.address, senderAcc.address,
                supplyAmountInWei, borrowAmountWei, 10,
            );
            const exchangeData = await formatMockExchangeObj(
                collToken,
                debtToken,
                supplyAmountInWei.mul('100').div('105'),
            );
            const infoBeforeBoost = await view.callStatic.userData(controllerAddr, proxy.address);
            const collTokenBefore = await balanceOf(collToken.address, senderAcc.address);
            const debtTokenBefore = await balanceOf(debtToken.address, senderAcc.address);
            await llamalendRepay(
                proxy,
                controllerAddr,
                exchangeData,
                senderAcc.address,
            );
            const collTokenAfter = await balanceOf(collToken.address, senderAcc.address);
            const debtTokenAfter = await balanceOf(debtToken.address, senderAcc.address);
            expect(collTokenAfter).to.be.gt(collTokenBefore);
            expect(debtTokenAfter).to.be.gt(debtTokenBefore);
            const infoAfterBoost = await view.callStatic.userData(controllerAddr, proxy.address);
            console.log(infoAfterBoost.collRatio / 1e18);

            expect(infoAfterBoost.collRatio).to.be.eq(0);
            expect(infoAfterBoost.debtAmount).to.be.lt(infoBeforeBoost.debtAmount);
            // eslint-disable-next-line max-len
            expect(infoAfterBoost.marketCollateralAmount).to.be.lt(infoBeforeBoost.marketCollateralAmount);
        });
    }
});
