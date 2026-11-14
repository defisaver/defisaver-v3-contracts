const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot,
    revertToSnapshot,
    getProxy,
    redeploy,
    setBalance,
    approve,
    balanceOf,
    fetchAmountinUSDPrice,
    formatMockExchangeObj,
    setNewExchangeWrapper,
    chainIds,
} = require('../../utils/utils');
const {
    getControllers,
    collateralSupplyAmountInUsd,
    supplyToMarket,
} = require('../../utils/llamalend');
const { llamalendCreate, llamalendBoost } = require('../../utils/actions');

describe('LlamaLend-Boost', function () {
    this.timeout(80000);
    const network = hre.network.config.name;
    const chainId = chainIds[network];

    const controllers = getControllers(chainId);

    let senderAcc;
    let proxy;
    let snapshot;
    let view;
    let mockWrapper;
    let swapper;

    before(async () => {
        await hre.network.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        swapper = await redeploy('LlamaLendSwapper');
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
    for (let i = 0; i < controllers.length; i++) {
        const controllerAddr = controllers[i];
        [10000, 5000].forEach((fillBps) => {
            it(`should create a Llamalend position and then boost it in ${controllerAddr} Llamalend market with ${fillBps / 100}% fill`, async function () {
                const controller = await hre.ethers.getContractAt(
                    'ILlamaLendController',
                    controllerAddr,
                );
                const collTokenAddr = await controller.collateral_token();
                const debtTokenAddr = await controller.borrowed_token();
                const collToken = getAssetInfoByAddress(collTokenAddr, chainId);
                if (collToken.symbol === '?') this.skip();
                const debtToken = getAssetInfoByAddress(debtTokenAddr, chainId);
                if (debtToken.symbol === '?') this.skip();
                await supplyToMarket(controllerAddr, chainId);
                const supplyAmount = fetchAmountinUSDPrice(
                    collToken.symbol,
                    collateralSupplyAmountInUsd,
                );
                if (supplyAmount === 'Infinity') this.skip();
                const supplyAmountInWei = hre.ethers.utils
                    .parseUnits(supplyAmount, collToken.decimals)
                    .mul(2);
                const borrowAmountWei = (
                    await controller.max_borrowable(supplyAmountInWei, 10)
                ).div(4);

                await setBalance(collTokenAddr, senderAcc.address, supplyAmountInWei);
                await approve(collTokenAddr, proxy.address, senderAcc);
                await llamalendCreate(
                    proxy,
                    controllerAddr,
                    senderAcc.address,
                    senderAcc.address,
                    supplyAmountInWei,
                    borrowAmountWei,
                    10,
                );

                const boostAmount = borrowAmountWei.mul(2);
                const exchangeData = await formatMockExchangeObj(
                    debtToken,
                    collToken,
                    boostAmount,
                    mockWrapper,
                    fillBps,
                );
                const infoBeforeBoost = await view.callStatic.userData(
                    controllerAddr,
                    proxy.address,
                );
                const walletDebtBefore = await balanceOf(debtTokenAddr, proxy.address);
                await llamalendBoost(proxy, controllerAddr, i, exchangeData);
                const infoAfterBoost = await view.callStatic.userData(
                    controllerAddr,
                    proxy.address,
                );
                expect(infoAfterBoost.collRatio).to.be.lt(infoBeforeBoost.collRatio);
                expect(infoAfterBoost.debtAmount).to.be.gt(infoBeforeBoost.debtAmount);
                expect(infoAfterBoost.marketCollateralAmount).to.be.gt(
                    infoBeforeBoost.marketCollateralAmount,
                );
                const refund = boostAmount.sub(boostAmount.mul(fillBps).div(10000));
                expect(await balanceOf(debtTokenAddr, proxy.address)).to.eq(
                    walletDebtBefore.add(refund),
                );
                expect(await balanceOf(debtTokenAddr, swapper.address)).to.eq(0);
                expect(await balanceOf(collTokenAddr, swapper.address)).to.eq(0);
            });
        });
    }
});
