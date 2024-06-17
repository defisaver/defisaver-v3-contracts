const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, fetchAmountinUSDPrice, balanceOf,
    formatMockExchangeObj,
    setNewExchangeWrapper,
    chainIds,
} = require('../../utils');
const {
    getControllers, collateralSupplyAmountInUsd, levBorrowAmountInUsd, supplyToMarket,
} = require('../utils');
const { llamalendLevCreate } = require('../../actions');

describe('LlamaLend-Lev-Create', function () {
    this.timeout(80000);
    const network = hre.network.config.name;
    const chainId = chainIds[network];

    const controllers = getControllers(chainId);

    let senderAcc; let proxy; let snapshot; let view; let mockWrapper;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        await redeploy('LlamaLendLevCreate');
        await redeploy('LlamaLendSwapper');
        await redeploy('TxSaverExecutor');
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
        it(`should leverage create a Llamalend position in ${controllerAddr} Llamalend market`, async () => {
            const controller = await hre.ethers.getContractAt('ILlamaLendController', controllerAddr);
            const collTokenAddr = await controller.collateral_token();
            const debtTokenAddr = await controller.borrowed_token();
            const collToken = getAssetInfoByAddress(collTokenAddr, chainId);
            if (collToken.symbol === '?') return;
            const debtToken = getAssetInfoByAddress(debtTokenAddr, chainId);
            if (debtToken.symbol === '?') return;
            await supplyToMarket(controllerAddr, chainId);
            const supplyAmount = fetchAmountinUSDPrice(
                collToken.symbol, collateralSupplyAmountInUsd,
            );
            const borrowAmount = fetchAmountinUSDPrice(
                debtToken.symbol, levBorrowAmountInUsd,
            );
            if (supplyAmount === 'Infinity') return;
            if (borrowAmount === 'Infinity') return;
            const supplyAmountInWei = hre.ethers.utils.parseUnits(
                supplyAmount, collToken.decimals,
            );
            const borrowAmountWei = hre.ethers.utils.parseUnits(
                borrowAmount, debtToken.decimals,
            );
            const exchangeData = await formatMockExchangeObj(
                debtToken,
                collToken,
                borrowAmountWei,
            );

            await setBalance(collTokenAddr, senderAcc.address, supplyAmountInWei);
            await approve(collTokenAddr, proxy.address, senderAcc);
            const debtTokenBalanceBefore = await balanceOf(debtTokenAddr, senderAcc.address);
            await llamalendLevCreate(
                proxy, controllerAddr, i, senderAcc.address,
                supplyAmountInWei, exchangeData, 10,
            );
            const debtTokenBalanceAfter = await balanceOf(debtTokenAddr, senderAcc.address);
            expect(debtTokenBalanceAfter.sub(debtTokenBalanceBefore)).to.be.eq(0);
            const positionInfo = await view.callStatic.userData(controllerAddr, proxy.address);
            console.log(positionInfo.collRatio / 1e18);
            expect(borrowAmountWei).to.be.closeTo(positionInfo.debtAmount, 1);
        });
    }
});
