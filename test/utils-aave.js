const hre = require('hardhat');

const aaveV2assetsDefaultMarket = [
    'ETH', 'AAVE', 'BAT', 'BUSD', 'DAI', 'ENJ', 'KNC', 'LINK', 'MANA', 'MKR', 'REN', 'SNX', 'SUSD', 'TUSD', 'UNI', 'USDC', 'USDT', 'WBTC', 'YFI', 'ZRX',
];

const AAVE_MARKET_DATA_ADDR = '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d';

const STABLE_RATE = 1;
const VARIABLE_RATE = 2;

const getAaveDataProvider = async () => {
    const dataProvider = await hre.ethers.getContractAt('IAaveProtocolDataProviderV2', AAVE_MARKET_DATA_ADDR);
    return dataProvider;
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

module.exports = {
    getAaveDataProvider,
    getAaveTokenInfo,
    getAaveReserveInfo,
    getAaveReserveData,
    aaveV2assetsDefaultMarket,
    STABLE_RATE,
    VARIABLE_RATE,
};
