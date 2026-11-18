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
    nullAddress,
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
const { llamalendCreate, llamalendSelfLiquidateWithColl } = require('../../utils/actions');

describe('LlamaLend-Self-Liq-With-Coll (deployed actions)', function () {
    this.timeout(80000);
    const network = hre.network.config.name;
    const chainId = chainIds[network];
    const controllers = getControllers(chainId);
    const unsupportedMainnetControllers = [
        '0x1E0165DbD2019441aB7927C018701f3138114D71', // wstETH
        '0x413FD2511BAD510947a91f5c6c79EBD8138C29Fc', // tBTC
        '0xEdA215b7666936DEd834f76f3fBC6F323295110A', // CRV
        '0xC510d73Ad34BeDECa8978B6914461aA7b50CF3Fc', // crvUSD
        '0xa5D9137d2A1Ee912469d911A8E74B6c77503bac8', // crvUSD
        '0xe438658874b0acf4D81c24172E137F0eE00621b8', // crvUSD
        '0x98Fc283d6636f6DCFf5a817A00Ac69A3ADd96907', // sUSDe
    ];

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
        // The deployed mainnet action calls the 6-arg liquidate_extended only for the old WETH
        // controller. These older controllers have no 5-arg overload, so it cannot liquidate them.
        if (chainId === 1 && unsupportedMainnetControllers.includes(controllerAddr)) {
            continue;
        }
        [false, true].forEach((skipCallback) => {
            it(`should self liquidate in ${controllerAddr}${skipCallback ? ' without a callback' : ' with a callback'}`, async function () {
                const controller = await hre.ethers.getContractAt(
                    'ILlamaLendController',
                    controllerAddr,
                );
                const collTokenAddr = await controller.collateral_token();
                const debtTokenAddr = await controller.borrowed_token();
                const collToken = getAssetInfoByAddress(collTokenAddr, chainId);
                const debtToken = getAssetInfoByAddress(debtTokenAddr, chainId);
                if (collToken.symbol === '?' || debtToken.symbol === '?') this.skip();
                await supplyToMarket(controllerAddr, chainId);
                const supplyAmount = fetchAmountinUSDPrice(
                    collToken.symbol,
                    collateralSupplyAmountInUsd,
                );
                if (supplyAmount === 'Infinity') this.skip();
                const supplyAmountInWei = hre.ethers.utils.parseUnits(
                    supplyAmount,
                    collToken.decimals,
                );
                // The AMM price can only be pushed a limited number of bands away from the oracle,
                // so the no-callback case borrows close to the max to stay within reach.
                const maxBorrow = await controller.max_borrowable(supplyAmountInWei, 10);
                const borrowAmountWei = skipCallback
                    ? maxBorrow.mul(99).div(100)
                    : maxBorrow.mul(3).div(4);
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

                const llammaAddress = await controller.amm();
                if (skipCallback) {
                    const swapAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(debtToken.symbol, '100000000'),
                        debtToken.decimals,
                    );
                    await setBalance(debtTokenAddr, senderAcc.address, swapAmount);
                    await approve(debtTokenAddr, llammaAddress);
                    const amm = await hre.ethers.getContractAt(
                        'contracts/interfaces/protocols/llamalend/ILLAMA.sol:ILLAMMA',
                        llammaAddress,
                    );
                    await amm.exchange(0, 1, swapAmount, 1, { gasLimit: 5000000 });
                }

                const exchangeData = await formatMockExchangeObj(
                    collToken,
                    debtToken,
                    supplyAmountInWei,
                );
                const positionInfo = await view.callStatic.userData(controllerAddr, proxy.address);
                if (skipCallback) {
                    expect(positionInfo.debtTokenCollateralAmount).to.be.gte(
                        positionInfo.debtAmount,
                    );
                    // An unexpected callback would fail on this unregistered exchange wrapper.
                    exchangeData[7] = nullAddress;
                } else {
                    expect(positionInfo.debtTokenCollateralAmount).to.be.lt(
                        positionInfo.debtAmount,
                    );
                }
                await llamalendSelfLiquidateWithColl(
                    proxy,
                    controllerAddr,
                    i,
                    hre.ethers.utils.parseUnits('1', 18),
                    0,
                    exchangeData,
                    senderAcc.address,
                    true,
                );
                expect(await controller.debt(proxy.address)).to.eq(0);
                expect(await balanceOf(debtTokenAddr, swapper.address)).to.eq(0);
                expect(await balanceOf(collTokenAddr, swapper.address)).to.eq(0);
            });
        });
    }
});
