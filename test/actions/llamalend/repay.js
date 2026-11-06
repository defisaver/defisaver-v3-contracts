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
    fetchAmountinUSDPrice,
    formatMockExchangeObj,
    setNewExchangeWrapper,
    balanceOf,
    chainIds,
} = require('../../utils/utils');
const {
    getControllers,
    collateralSupplyAmountInUsd,
    supplyToMarket,
} = require('../../utils/llamalend');
const { llamalendCreate, llamalendRepay } = require('../../utils/actions');

describe('LlamaLend-Repay', function () {
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

    // Opens a position and returns its tokens and collateral amount, or skips the test
    // when the market tokens are not known to the test helpers.
    const createPosition = async (test, controllerAddr) => {
        const controller = await hre.ethers.getContractAt('ILlamaLendController', controllerAddr);
        const collTokenAddr = await controller.collateral_token();
        const debtTokenAddr = await controller.borrowed_token();
        const collToken = getAssetInfoByAddress(collTokenAddr, chainId);
        const debtToken = getAssetInfoByAddress(debtTokenAddr, chainId);
        if (collToken.symbol === '?' || debtToken.symbol === '?') test.skip();
        await supplyToMarket(controllerAddr, chainId);
        const supplyAmount = fetchAmountinUSDPrice(collToken.symbol, collateralSupplyAmountInUsd);
        if (supplyAmount === 'Infinity') test.skip();
        const supplyAmountInWei = hre.ethers.utils.parseUnits(supplyAmount, collToken.decimals);
        const borrowAmountWei = (await controller.max_borrowable(supplyAmountInWei, 10))
            .mul(3)
            .div(4);

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

        // Collateral that sells for half of the debt at the mock exchange rate.
        const supplyValueInDebtWei = hre.ethers.utils.parseUnits(
            fetchAmountinUSDPrice(debtToken.symbol, collateralSupplyAmountInUsd),
            debtToken.decimals,
        );
        const partialSellAmount = supplyAmountInWei
            .mul(borrowAmountWei.div(2))
            .div(supplyValueInDebtWei);

        return { collToken, debtToken, supplyAmountInWei, partialSellAmount };
    };

    const expectEmptySwapper = async (collToken, debtToken) => {
        expect(await balanceOf(debtToken.address, swapper.address)).to.eq(0);
        expect(await balanceOf(collToken.address, swapper.address)).to.eq(0);
    };

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
        it(`should create a Llamalend position and then repay it partially in ${controllerAddr} Llamalend market`, async function () {
            const { collToken, debtToken, partialSellAmount } = await createPosition(
                this,
                controllerAddr,
            );

            const exchangeData = await formatMockExchangeObj(
                collToken,
                debtToken,
                partialSellAmount,
                mockWrapper,
            );
            const infoBeforeRepay = await view.callStatic.userData(controllerAddr, proxy.address);
            await llamalendRepay(proxy, controllerAddr, i, exchangeData, senderAcc.address);
            const infoAfterRepay = await view.callStatic.userData(controllerAddr, proxy.address);
            expect(infoAfterRepay.collRatio).to.be.gt(infoBeforeRepay.collRatio);
            expect(infoAfterRepay.debtAmount).to.be.lt(infoBeforeRepay.debtAmount);
            expect(infoAfterRepay.marketCollateralAmount).to.be.lt(
                infoBeforeRepay.marketCollateralAmount,
            );
            await expectEmptySwapper(collToken, debtToken);
        });
        it(`should create a Llamalend position and then repay it fully in ${controllerAddr} Llamalend market`, async function () {
            const { collToken, debtToken, supplyAmountInWei } = await createPosition(
                this,
                controllerAddr,
            );

            const exchangeData = await formatMockExchangeObj(
                collToken,
                debtToken,
                supplyAmountInWei.mul('100').div('105'),
                mockWrapper,
            );
            const infoBeforeRepay = await view.callStatic.userData(controllerAddr, proxy.address);
            const collTokenBefore = await balanceOf(collToken.address, senderAcc.address);
            const debtTokenBefore = await balanceOf(debtToken.address, senderAcc.address);
            await llamalendRepay(proxy, controllerAddr, i, exchangeData, senderAcc.address);
            const collTokenAfter = await balanceOf(collToken.address, senderAcc.address);
            const debtTokenAfter = await balanceOf(debtToken.address, senderAcc.address);
            expect(collTokenAfter).to.be.gt(collTokenBefore);
            expect(debtTokenAfter).to.be.gt(debtTokenBefore);
            const infoAfterRepay = await view.callStatic.userData(controllerAddr, proxy.address);

            expect(infoAfterRepay.collRatio).to.be.eq(0);
            expect(infoAfterRepay.debtAmount).to.be.lt(infoBeforeRepay.debtAmount);
            expect(infoAfterRepay.marketCollateralAmount).to.be.lt(
                infoBeforeRepay.marketCollateralAmount,
            );
            await expectEmptySwapper(collToken, debtToken);
        });
    }
});
