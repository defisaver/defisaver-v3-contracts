const hre = require('hardhat');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, fetchAmountinUSDPrice,
    formatMockExchangeObj,
    setNewExchangeWrapper,
    chainIds,
} = require('../../utils');
const {
    getControllers, collateralSupplyAmountInUsd, supplyToMarket,
    borrowAmountInUsd,
} = require('../utils');
const { llamalendCreate, llamalendSelfLiquidateWithColl } = require('../../actions');

describe('LlamaLend-Self-Liq-With-Coll', function () {
    this.timeout(80000);
    const network = hre.network.config.name;
    const chainId = chainIds[network];
    const controllers = getControllers(chainId);

    let senderAcc; let proxy; let snapshot; let view; let mockWrapper;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        snapshot = await takeSnapshot();
        await redeploy('LlamaLendCreate');
        await redeploy('LlamaLendSelfLiquidateWithColl');
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
        it(`should create a Llamalend position in ${controllerAddr} Llamalend market and then self liquidate it with coll when it's in soft liq`, async () => {
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
                i,
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
