/* eslint-disable array-callback-return */
/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');

const { addrs, getNetwork, nullAddress } = require('./utils');

const aaveV2assetsDefaultMarket = [
    'ETH', 'DAI', 'SUSD', 'USDC', 'USDT', 'WBTC',
    'CRV', 'AAVE',
];

const AAVE_MARKET_DATA_ADDR = '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d';
const LENDING_POOL_ADDRESS_PROVIDER_V2 = '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5';

const AAVE_NO_DEBT_MODE = 0;
const STABLE_RATE = 1;
const VARIABLE_RATE = 2;
const WETH_ASSET_ID_IN_AAVE_V3_MARKET = 0;
const WSETH_ASSET_ID_IN_AAVE_V3_MARKET = 1;
const LUSD_ASSET_ID_IN_AAVE_V3_MARKET = 10;
const A_WETH_ADDRESS_V3 = '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8';

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

const getPriceOracle = async () => {
    const lendingPoolAddressProvider = await hre.ethers.getContractAt('ILendingPoolAddressesProviderV2', LENDING_POOL_ADDRESS_PROVIDER_V2);
    return lendingPoolAddressProvider.getPriceOracle();
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

const getEstimatedTotalLiquidityForToken = async (tokenAddr) => {
    const dataProvider = await hre.ethers.getContractAt('IAaveProtocolDataProvider', addrs[getNetwork()].AAVE_V3_POOL_DATA_PROVIDER);
    const reserveData = await getAaveReserveData(dataProvider, tokenAddr);
    const totalAToken = reserveData.totalAToken;
    const totalDebt = reserveData.totalVariableDebt;
    return totalAToken.sub(totalDebt);
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

const getAaveV3PositionInfo = async (user, aaveV3View) => {
    const market = addrs[getNetwork()].AAVE_MARKET;
    const pool = await hre.ethers.getContractAt('IPoolAddressesProvider', market).then((c) => hre.ethers.getContractAt('IPoolV3', c.getPool()));
    const {
        eMode: emodeCategoryId,
        collAddr,
        enabledAsColl,
        borrowAddr,
    } = await aaveV3View.getLoanData(market, user);

    const collTokenAddresses = collAddr.filter((e) => e !== nullAddress);
    const useAsCollateralFlags = enabledAsColl.slice(0, collTokenAddresses.length);
    const debtTokenAddresses = borrowAddr.filter((e) => e !== nullAddress);

    const {
        collAssetIds,
        collATokenAddresses,
    } = await Promise.all(
        collTokenAddresses.map(async (c) => getAaveReserveData(pool, c)),
    ).then((arr) => arr.reduce((acc, { id, aTokenAddress }) => ({
        collAssetIds: [...acc.collAssetIds, id],
        collATokenAddresses: [...acc.collATokenAddresses, aTokenAddress],
    }), ({
        collAssetIds: [],
        collATokenAddresses: [],
    })));

    const {
        debtAssetIds,
    } = await Promise.all(
        debtTokenAddresses.map(async (c) => getAaveReserveData(pool, c)),
    ).then((arr) => arr.reduce((acc, { id }) => ({
        debtAssetIds: [...acc.debtAssetIds, id],
    }), ({
        debtAssetIds: [],
    })));

    const debtAmounts = await aaveV3View.getTokenBalances(
        market,
        user,
        debtTokenAddresses,
    ).then((r) => r.map(({ borrowsVariable }) => borrowsVariable));

    const collAmounts = await aaveV3View.getTokenBalances(
        market,
        user,
        collTokenAddresses,
    ).then((r) => r.map(({ balance }) => balance));

    return {
        collAssetIds,
        collATokenAddresses,
        useAsCollateralFlags,
        collAmounts,

        emodeCategoryId,
        debtTokenAddresses,
        debtAssetIds,
        debtAmounts,
    };
};

const expectTwoAaveV3PositionsToBeEqual = (oldPosition, newPosition) => {
    expect(oldPosition.emodeCategoryId).to.be.eq(newPosition.emodeCategoryId);
    oldPosition.collAssetIds.map((e, i) => expect(e).to.be.eq(newPosition.collAssetIds[i]));
    oldPosition.collATokenAddresses.map((e, i) => expect(e).to.be.eq(newPosition.collATokenAddresses[i]));
    oldPosition.useAsCollateralFlags.map((e, i) => expect(e).to.be.eq(newPosition.useAsCollateralFlags[i]));
    oldPosition.debtTokenAddresses.map((e, i) => expect(e).to.be.eq(newPosition.debtTokenAddresses[i]));
    oldPosition.debtAssetIds.map((e, i) => expect(e).to.be.eq(newPosition.debtAssetIds[i]));

    oldPosition.collAmounts.map((e, i) => {
        expect(newPosition.collAmounts[i]).to.be.gte(e);
        expect(newPosition.collAmounts[i].sub(e)).to.be.lte(e.div(1000));
    });
    oldPosition.debtAmounts.map((e, i) => {
        expect(newPosition.debtAmounts[i]).to.be.gte(e);
        expect(newPosition.debtAmounts[i].sub(e)).to.be.lte(e.div(1000));
    });
};

module.exports = {
    getAaveDataProvider,
    getAaveLendingPoolV2,
    getAaveTokenInfo,
    getAaveReserveInfo,
    getAaveReserveData,
    isAssetBorrowableV3,
    getEstimatedTotalLiquidityForToken,
    getPriceOracle,
    getAaveV3PositionInfo,
    expectTwoAaveV3PositionsToBeEqual,
    aaveV2assetsDefaultMarket,
    AAVE_NO_DEBT_MODE,
    STABLE_RATE,
    VARIABLE_RATE,
    WETH_ASSET_ID_IN_AAVE_V3_MARKET,
    LUSD_ASSET_ID_IN_AAVE_V3_MARKET,
    WSETH_ASSET_ID_IN_AAVE_V3_MARKET,
    A_WETH_ADDRESS_V3,
};
