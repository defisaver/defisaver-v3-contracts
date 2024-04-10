const hre = require('hardhat');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, fetchAmountinUSDPrice,
    formatMockExchangeObj,
    setNewExchangeWrapper,
} = require('../../utils');
const {
    getControllers, collateralSupplyAmountInUsd, supplyToMarket,
    borrowAmountInUsd,
} = require('../utils');
const { llamalendCreate, llamalendSelfLiquidateWithColl } = require('../../actions');

describe('LlamaLend-Create', function () {
    this.timeout(80000);

    const controllers = getControllers();

    let senderAcc; let proxy; let snapshot; let view; let mockWrapper;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('LlamaLendCreate');
        await redeploy('LlamaLendSelfLiquidateWithColl');
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
        it(`should create a Llamalend position in ${controllerAddr} Llamalend market and then self liquidate it with coll when it's in soft liq`, async () => {
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
            console.log(supplyAmountInWei);
            console.log(borrowAmountWei);
            await llamalendCreate(
                proxy, controllerAddr, senderAcc.address, senderAcc.address,
                supplyAmountInWei, borrowAmountWei, 10,
            );

            const llammaAddress = await controller.amm();
            const llamaSwapAmount = fetchAmountinUSDPrice(
                debtToken.symbol, '2000000',
            );
            const llamaSwapAmountInWei = hre.ethers.utils.parseUnits(
                llamaSwapAmount, debtToken.decimals,
            );

            await setBalance(debtTokenAddr, senderAcc.address, llamaSwapAmountInWei);
            await approve(debtTokenAddr, llammaAddress);
            const llammaExchange = await hre.ethers.getContractAt('contracts/interfaces/llamalend/ILLAMA.sol:ILLAMMA', llammaAddress);
            await llammaExchange.exchange(0, 1, llamaSwapAmountInWei, 1, { gasLimit: 5000000 });

            const exchangeData = await formatMockExchangeObj(
                collToken,
                debtToken,
                supplyAmountInWei,
            );
            let positionInfo = await view.callStatic.userData(controllerAddr, proxy.address);
            console.log(positionInfo.collRatio / 1e18);
            console.log(positionInfo.marketCollateralAmount);
            console.log(positionInfo.debtTokenCollateralAmount);
            console.log(positionInfo.isInSoftLiquidation);
            await llamalendSelfLiquidateWithColl(
                proxy,
                controllerAddr,
                hre.ethers.utils.parseUnits('100', 18),
                1,
                exchangeData,
                senderAcc.address,
                true,
            );
            positionInfo = await view.callStatic.userData(controllerAddr, proxy.address);
        });
    }
});
