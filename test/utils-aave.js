const hre = require('hardhat');

const aaveV2assetsDefaultMarket = [
    'ETH', 'DAI', 'SUSD', 'USDC', 'USDT', 'WBTC',
    'CRV', 'AAVE',
];

const AAVE_MARKET_DATA_ADDR = '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d';
const LENDING_POOL_ADDRESS_PROVIDER_V2 = '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5';

const STABLE_RATE = 1;
const VARIABLE_RATE = 2;

const getAaveDataProvider = async () => {
    const dataProvider = await hre.ethers.getContractAt('IAaveProtocolDataProviderV2', AAVE_MARKET_DATA_ADDR);
    return dataProvider;
};

const getAaveLendingPoolV2 = async () => {
    const lendingPoolAddressProvider = await hre.ethers.getContractAt('ILendingPoolAddressesProviderV2', LENDING_POOL_ADDRESS_PROVIDER_V2);
    const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool();
    const lendingPool = await hre.ethers.getContractAt('ILendingPoolV2', lendingPoolAddress);
    return lendingPool;
};

const getAaveTokenInfo = async (dataProvider, tokenAddr) => {
    const tokens = await dataProvider.getReserveTokensAddresses(tokenAddr);
    return tokens;
};

const getAaveReserveInfo = async (dataProvider, tokenAddr) => {
    const tokens = await dataProvider.getReserveConfigurationData(tokenAddr);
    return tokens;
};

const getAaveReserveData = async (dataProvider, tokenAddr) => {
    const tokens = await dataProvider.getReserveData(tokenAddr);
    return tokens;
};

const isAssetBorrowableV3 = async (dataProviderAddr, tokenAddr, checkStableBorrow = false) => {
    const protocolDataProvider = await hre.ethers.getContractAt('IAaveProtocolDataProvider', dataProviderAddr);

    const isPausedAsset = await protocolDataProvider.getPaused(tokenAddr);
    const { isActive, isFrozen, stableBorrowRateEnabled } = await protocolDataProvider
        .getReserveConfigurationData(tokenAddr);

    const canBorrow = !isPausedAsset && isActive && !isFrozen;

    if (checkStableBorrow) {
        return canBorrow && stableBorrowRateEnabled;
    }

    return canBorrow;
};

module.exports = {
    getAaveDataProvider,
    getAaveLendingPoolV2,
    getAaveTokenInfo,
    getAaveReserveInfo,
    getAaveReserveData,
    isAssetBorrowableV3,
    aaveV2assetsDefaultMarket,
    STABLE_RATE,
    VARIABLE_RATE,
};
