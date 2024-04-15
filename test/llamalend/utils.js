const { getAssetInfoByAddress } = require('@defisaver/tokens');
const hre = require('hardhat');
const { setBalance, fetchAmountinUSDPrice, approve } = require('../utils');

const loanTokenSupplyAmountInUsd = '500000';
const collateralSupplyAmountInUsd = '50000';
const borrowAmountInUsd = '30000';
const levBorrowAmountInUsd = '60000';

const getControllers = () => [
    '0x1E0165DbD2019441aB7927C018701f3138114D71',
    '0xaade9230AA9161880E13a38C83400d3D1995267b',
    '0x413FD2511BAD510947a91f5c6c79EBD8138C29Fc',
    '0xEdA215b7666936DEd834f76f3fBC6F323295110A',
    '0xC510d73Ad34BeDECa8978B6914461aA7b50CF3Fc',
    '0xa5D9137d2A1Ee912469d911A8E74B6c77503bac8',
    '0xe438658874b0acf4D81c24172E137F0eE00621b8',
    '0x98Fc283d6636f6DCFf5a817A00Ac69A3ADd96907',
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
