const { getAssetInfoByAddress } = require('@defisaver/tokens');
const hre = require('hardhat');
const { setBalance, fetchAmountinUSDPrice, approve } = require('../utils');

const MORPHO_BLUE_ADDRESS = '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb';
const loanTokenSupplyAmountInUsd = '50000';
const collateralSupplyAmountInUsd = '50000';
const borrowAmountInUsd = '30000';

const getMarkets = () => [
    [
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        '0x2a01eb9496094da03c4e364def50f5ad1280ad72',
        '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
        '945000000000000000',
    ],
    [
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        '0x48f7e36eb6b826b2df4b2e630b62cd25e89e40e2',
        '0x870ac11d48b15db9a138cf899d20f13f79ba00bc',
        '860000000000000000',
    ],
];
const supplyToMarket = async (marketParams) => {
    const [wallet] = await hre.ethers.getSigners();
    const morphoBlue = await hre.ethers.getContractAt('IMorphoBlue', MORPHO_BLUE_ADDRESS);
    const loanToken = getAssetInfoByAddress(marketParams[0]);
    const supplyAmount = fetchAmountinUSDPrice(loanToken.symbol, loanTokenSupplyAmountInUsd);
    const supplyAmountInWei = hre.ethers.utils.parseUnits(supplyAmount, loanToken.decimals);
    await setBalance(
        loanToken.address,
        wallet.address,
        supplyAmountInWei,
    );
    await approve(loanToken.address, MORPHO_BLUE_ADDRESS, wallet);
    await morphoBlue.supply(marketParams, supplyAmountInWei, '0', wallet.address, [], { gasLimit: 3000000 });
};

module.exports = {
    getMarkets,
    supplyToMarket,
    loanTokenSupplyAmountInUsd,
    collateralSupplyAmountInUsd,
    borrowAmountInUsd,
    MORPHO_BLUE_ADDRESS,
};
