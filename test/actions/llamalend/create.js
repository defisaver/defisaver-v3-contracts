const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, fetchAmountinUSDPrice, balanceOf,
    chainIds,
} = require('../../utils/utils');
const {
    getControllers, collateralSupplyAmountInUsd, borrowAmountInUsd, supplyToMarket,
} = require('../../utils/llamalend');
const { llamalendCreate } = require('../../utils/actions');

describe('LlamaLend-Create', function () {
    this.timeout(80000);
    const network = hre.network.config.name;
    const chainId = chainIds[network];
    const controllers = getControllers(chainId);

    let senderAcc; let proxy; let snapshot; let view;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        snapshot = await takeSnapshot();
        await redeploy('LlamaLendCreate');
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
        it(`should create a Llamalend position in ${controllerAddr} Llamalend market`, async () => {
            const controller = await hre.ethers.getContractAt('ILlamaLendController', controllerAddr);
            const collTokenAddr = await controller.collateral_token();
            const debtTokenAddr = await controller.borrowed_token();
            const collToken = getAssetInfoByAddress(collTokenAddr, chainId);
            const debtToken = getAssetInfoByAddress(debtTokenAddr, chainId);
            await supplyToMarket(controllerAddr, chainId);
            const supplyAmount = fetchAmountinUSDPrice(
                collToken.symbol, collateralSupplyAmountInUsd,
            );
            const borrowAmount = fetchAmountinUSDPrice(
                debtToken.symbol, borrowAmountInUsd,
            );
            if (supplyAmount === 'Infinity') return;
            if (borrowAmount === 'Infinity') return;
            const supplyAmountInWei = hre.ethers.utils.parseUnits(
                supplyAmount, collToken.decimals,
            );
            const borrowAmountWei = hre.ethers.utils.parseUnits(
                borrowAmount, debtToken.decimals,
            );

            await setBalance(collTokenAddr, senderAcc.address, supplyAmountInWei);
            await approve(collTokenAddr, proxy.address, senderAcc);
            const debtTokenBalanceBefore = await balanceOf(debtTokenAddr, senderAcc.address);
            await llamalendCreate(
                proxy, controllerAddr, senderAcc.address, senderAcc.address,
                supplyAmountInWei, borrowAmountWei, 10,
            );
            const debtTokenBalanceAfter = await balanceOf(debtTokenAddr, senderAcc.address);
            expect(debtTokenBalanceAfter.sub(debtTokenBalanceBefore)).to.be.eq(borrowAmountWei);
            const positionInfo = await view.callStatic.userData(controllerAddr, proxy.address);
            console.log(positionInfo.collRatio / 1e18);
            expect(supplyAmountInWei).to.be.closeTo(positionInfo.marketCollateralAmount, 10);
            expect(borrowAmountWei).to.be.closeTo(positionInfo.debtAmount, 1);
        });
    }
});
