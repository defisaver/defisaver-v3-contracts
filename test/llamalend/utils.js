const { getAssetInfoByAddress } = require('@defisaver/tokens');
const hre = require('hardhat');
const { setBalance, fetchAmountinUSDPrice, approve } = require('../utils');

const loanTokenSupplyAmountInUsd = '500000';
const collateralSupplyAmountInUsd = '50000';
const borrowAmountInUsd = '30000';
const levBorrowAmountInUsd = '60000';

const getControllers = () => [
    '0xeda215b7666936ded834f76f3fbc6f323295110a', // crv/crvusd
    '0xc510d73ad34bedeca8978b6914461aa7b50cf3fc', // crvusd/crv
    '0xaade9230aa9161880e13a38c83400d3d1995267b', // weth/crvusd
    '0xa5d9137d2a1ee912469d911a8e74b6c77503bac8', // crvusd/weth
    '0x98fc283d6636f6dcff5a817a00ac69a3add96907', // susde/crvusd
    '0x413fd2511bad510947a91f5c6c79ebd8138c29fc', // tbtc/crvusd
    '0xe438658874b0acf4d81c24172e137f0ee00621b8', // crvusd/tbtc
    '0x1e0165dbd2019441ab7927c018701f3138114d71', // wsteth/crvusd
];
const supplyToMarket = async (controllerAddr) => {
    const [wallet] = await hre.ethers.getSigners();
    const controller = await hre.ethers.getContractAt('ILlamaLendController', controllerAddr);
    const vaultAddr = await controller.factory();
    const loanTokenAddress = await controller.borrowed_token();
    const loanToken = getAssetInfoByAddress(loanTokenAddress);
    const supplyAmount = fetchAmountinUSDPrice(loanToken.symbol, loanTokenSupplyAmountInUsd);
    const supplyAmountInWei = hre.ethers.utils.parseUnits(supplyAmount, loanToken.decimals);
    await setBalance(
        loanToken.address,
        wallet.address,
        supplyAmountInWei,
    );
    await approve(loanToken.address, vaultAddr, wallet);
    const vaultContract = await hre.ethers.getContractAt('IERC4626', vaultAddr);
    await vaultContract.deposit(supplyAmountInWei, wallet.address, { gasLimit: 3000000 });
};

const getActiveBand = async (controllerAddress) => {
    const llammaAddress = await hre.ethers.getContractAt('ILlamaLendController', controllerAddress).then((c) => c.amm());
    const activeBand = await hre.ethers.getContractAt('contracts/interfaces/llamalend/ILLAMA.sol:ILLAMMA', llammaAddress).then((c) => c.active_band_with_skip());

    return activeBand;
};

module.exports = {
    getControllers,
    supplyToMarket,
    getActiveBand,
    loanTokenSupplyAmountInUsd,
    collateralSupplyAmountInUsd,
    borrowAmountInUsd,
    levBorrowAmountInUsd,
};
