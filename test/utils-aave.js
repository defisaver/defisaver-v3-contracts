const hre = require("hardhat");

const AAVE_MARKET_DATA_ADDR = '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d';

const getAaveDataProvider = async () => {
    const dataProvider = await hre.ethers.getContractAt("IAaveProtocolDataProviderV2", AAVE_MARKET_DATA_ADDR);
    return dataProvider;
};

module.exports = {
    getAaveDataProvider,
};