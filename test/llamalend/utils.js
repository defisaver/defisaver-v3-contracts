const { getAssetInfoByAddress } = require('@defisaver/tokens');
const hre = require('hardhat');
const { setBalance, fetchAmountinUSDPrice, approve } = require('../utils');

const loanTokenSupplyAmountInUsd = '500000';
const collateralSupplyAmountInUsd = '50000';
const borrowAmountInUsd = '30000';
const levBorrowAmountInUsd = '60000';

const getControllers = (chainId) => {
    if (chainId === 1) {
        return [
            '0x1E0165DbD2019441aB7927C018701f3138114D71',
            '0xaade9230AA9161880E13a38C83400d3D1995267b',
            '0x413FD2511BAD510947a91f5c6c79EBD8138C29Fc',
            '0xEdA215b7666936DEd834f76f3fBC6F323295110A',
            '0xC510d73Ad34BeDECa8978B6914461aA7b50CF3Fc',
            '0xa5D9137d2A1Ee912469d911A8E74B6c77503bac8',
            '0xe438658874b0acf4D81c24172E137F0eE00621b8',
            '0x98Fc283d6636f6DCFf5a817A00Ac69A3ADd96907',
            '0x09dBDEB3b301A4753589Ac6dF8A178C7716ce16B',
            '0xcaD85b7fe52B1939DCEebEe9bCf0b2a5Aa0cE617',
            '0x4f87158350c296955966059C50263F711cE0817C',
            '0xB536FEa3a01c95Dd09932440eC802A75410139D6',
            '0x23F5a668A9590130940eF55964ead9787976f2CC',
            '0x5756A035F276a8095A922931F224F4ed06149608',
            '0x74f88Baa966407b50c10B393bBD789639EFfE78B',
            '0x8C2537F1a5b1b167A960A14B89f7860dd5F7cD68',
        ];
    }
    if (chainId === 42161) {
        return [
            '0xB5B6f0E69c283AA32425FA18220e64283B51F0A4',
            '0x013be86e1cdb0f384dAF24Bd974FE75EdFfe6B68',
            '0x28c20590de7539C316191F413686dcF794d8898E',
            '0x5014AB37Fca7201baDEc3C0d0f28Dc7899cdC7D5',
            '0x88f88e937Db48bBfe8E3091718576430704e47Ab',
            '0x76709bC0dA299Ab0234EEC51385E900922AE98f5',
            '0xAe659CE8f2f23649E09e92D164244AA127A7a2c7',
            '0x7Adcc491f0B7f9BC12837B8F5Edf0e580d176F1f',
            '0x4064Ed6Ae070F126F56c47c8a8CdD6B924668b5D',
            '0xB5c6082d3307088C98dA8D79991501E113e6365d',
            '0xb9aDddCf4e01c2f64F8F2CD9a050DC35585ea053',
            '0xeCF99dE21c31eC75b4Fb97e980F9d084b1d8Da8f',
            '0xF4e35f69D0BeE1AFC26EE73f12Fa7fA220F16F40',
        ];
    }
    return [];
};

const supplyToMarket = async (controllerAddr, chainId) => {
    const [wallet] = await hre.ethers.getSigners();
    const controller = await hre.ethers.getContractAt('ILlamaLendController', controllerAddr);
    const vaultAddr = await controller.factory();
    const loanTokenAddress = await controller.borrowed_token();
    const loanToken = getAssetInfoByAddress(loanTokenAddress, chainId);
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
