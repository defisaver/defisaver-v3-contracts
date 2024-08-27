const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    fetchAmountInUSDPrice,
    addrs,
    network,
    openStrategyAndBundleStorage,
} = require('../../../utils');

const { chainIds } = require('../../../../scripts/utils/fork');
const {
    createAaveV3OpenOrderFromCollStrategy,
    createAaveV3FLOpenOrderFromCollStrategy,
} = require('../../../strategies');
const { createStrategy, createBundle } = require('../../../utils-strategies');

module.exports.getAaveV3TestPairs = async (collAmountInUsd, debtAmountInUsd) => {
    const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
    const poolAddress = await aaveMarketContract.getPool();
    const pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

    const wethAsset = getAssetInfo('WETH', chainIds[network]);
    const daiAsset = getAssetInfo('DAI', chainIds[network]);
    const wbtcAsset = getAssetInfo('WBTC', chainIds[network]);
    const usdcAsset = getAssetInfo('USDC', chainIds[network]);

    const wethReserveData = await pool.getReserveData(wethAsset.addresses[chainIds[network]]);
    const daiReserveData = await pool.getReserveData(daiAsset.addresses[chainIds[network]]);
    const wbtcReserveData = await pool.getReserveData(wbtcAsset.addresses[chainIds[network]]);
    const usdcReserveData = await pool.getReserveData(usdcAsset.addresses[chainIds[network]]);

    const testPairs = [
        {
            collAsset: wethAsset,
            debtAsset: daiAsset,
            collAmount: await fetchAmountInUSDPrice('WETH', collAmountInUsd),
            debtAmount: await fetchAmountInUSDPrice('DAI', debtAmountInUsd),
            collAssetId: wethReserveData.id,
            debtAssetId: daiReserveData.id,
        },
        {
            collAsset: wbtcAsset,
            debtAsset: usdcAsset,
            collAmount: await fetchAmountInUSDPrice('WBTC', collAmountInUsd),
            debtAmount: await fetchAmountInUSDPrice('USDC', debtAmountInUsd),
            collAssetId: wbtcReserveData.id,
            debtAssetId: usdcReserveData.id,
        },
    ];

    return testPairs;
};

module.exports.deployOpenOrderFromCollBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);

    const openStrategy = createAaveV3OpenOrderFromCollStrategy();
    const flOpenStrategy = createAaveV3FLOpenOrderFromCollStrategy();
    const aaveV3OpenOrderFromCollStrategyId = await createStrategy(
        proxy,
        ...openStrategy,
        false,
    );
    const aaveV3FLOpenOrderFromCollStrategyId = await createStrategy(
        proxy,
        ...flOpenStrategy,
        false,
    );
    const aaveV3OpenOrderFromCollBundleId = await createBundle(
        proxy,
        [aaveV3OpenOrderFromCollStrategyId, aaveV3FLOpenOrderFromCollStrategyId],
    );
    return aaveV3OpenOrderFromCollBundleId;
};
