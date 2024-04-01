const { getAssetInfoByAddress } = require('@defisaver/tokens');
const hre = require('hardhat');
const { setBalance, fetchAmountinUSDPrice, approve } = require('../utils');

const loanTokenSupplyAmountInUsd = '500000';
const collateralSupplyAmountInUsd = '50000';
const borrowAmountInUsd = '30000';

const getControllers = () => [
    '0x43fc0f246F952ff12B757341A91cF4040711dDE9', // crvusd/crv
    '0x5E657c5227A596a860621C5551c9735d8f4A8BE3', // wsteth/crvusd
    '0x7443944962D04720f8c220C0D25f56F869d6EfD4', // crv/crvusd
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
};
