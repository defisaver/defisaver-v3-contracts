const hre = require('hardhat');
const { expect } = require('chai');
const dfs = require('@defisaver/sdk');
const {
    addrs,
    nullAddress,
    network,
    isNetworkFork,
    openStrategyAndBundleStorage,
    chainIds,
    fetchAmountInUSDPrice,
    setBalance,
    approve,
    getContractFromRegistry,
} = require('./utils');
const {
    createSparkGenericFLCloseToDebtStrategy,
    createSparkGenericFLCloseToCollStrategy,
    createSparkRepayOnPriceStrategy,
    createSparkFLRepayOnPriceStrategy,
    createSparkBoostOnPriceStrategy,
    createSparkFLBoostOnPriceStrategy,
} = require('../../strategies-spec/mainnet');
const { createStrategy, createBundle } = require('../strategies/utils/utils-strategies');
const { getAssetInfo } = require('@defisaver/tokens');
const { executeAction } = require('./actions');

const getSparkReserveData = async (dataProvider, tokenAddr) => {
    const tokens = await dataProvider.getReserveData(tokenAddr);
    return tokens;
};

const getSparkPositionInfo = async (user, sparkView) => {
    const market = addrs[network].SPARK_MARKET;
    const pool = await hre.ethers
        .getContractAt('IPoolAddressesProvider', market)
        .then((c) => hre.ethers.getContractAt('IPoolV3', c.getPool()));
    const {
        eMode: emodeCategoryId,
        collAddr,
        enabledAsColl,
        borrowAddr,
    } = await sparkView.getLoanData(market, user);

    const collTokenAddresses = collAddr.filter((e) => e !== nullAddress);
    const useAsCollateralFlags = enabledAsColl.slice(0, collTokenAddresses.length);
    const debtTokenAddresses = borrowAddr.filter((e) => e !== nullAddress);

    const { collAssetIds, collATokenAddresses } = await Promise.all(
        collTokenAddresses.map(async (c) => getSparkReserveData(pool, c)),
    ).then((arr) =>
        arr.reduce(
            (acc, { id, aTokenAddress }) => ({
                collAssetIds: [...acc.collAssetIds, id],
                collATokenAddresses: [...acc.collATokenAddresses, aTokenAddress],
            }),
            {
                collAssetIds: [],
                collATokenAddresses: [],
            },
        ),
    );

    const { debtAssetIds } = await Promise.all(
        debtTokenAddresses.map(async (c) => getSparkReserveData(pool, c)),
    ).then((arr) =>
        arr.reduce(
            (acc, { id }) => ({
                debtAssetIds: [...acc.debtAssetIds, id],
            }),
            {
                debtAssetIds: [],
            },
        ),
    );

    const debtAmounts = await sparkView
        .getTokenBalances(market, user, debtTokenAddresses)
        .then((r) => r.map(({ borrowsVariable }) => borrowsVariable));

    const collAmounts = await sparkView
        .getTokenBalances(market, user, collTokenAddresses)
        .then((r) => r.map(({ balance }) => balance));

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

const expectTwoSparkPositionsToBeEqual = (oldPosition, newPosition) => {
    expect(oldPosition.emodeCategoryId).to.be.eq(newPosition.emodeCategoryId);
    oldPosition.collAssetIds.map((e, i) => expect(e).to.be.eq(newPosition.collAssetIds[i]));
    oldPosition.collATokenAddresses.map((e, i) =>
        expect(e).to.be.eq(newPosition.collATokenAddresses[i]),
    );
    oldPosition.useAsCollateralFlags.map((e, i) =>
        expect(e).to.be.eq(newPosition.useAsCollateralFlags[i]),
    );
    oldPosition.debtTokenAddresses.map((e, i) =>
        expect(e).to.be.eq(newPosition.debtTokenAddresses[i]),
    );
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

const deploySparkCloseGenericBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const flCloseToDebtStrategy = createSparkGenericFLCloseToDebtStrategy();
    const flCloseToCollStrategy = createSparkGenericFLCloseToCollStrategy();
    const continuous = false;
    const flCloseToDebtStrategyId = await createStrategy(...flCloseToDebtStrategy, continuous);
    const flCloseToCollStrategyId = await createStrategy(...flCloseToCollStrategy, continuous);
    const bundleId = await createBundle([flCloseToDebtStrategyId, flCloseToCollStrategyId]);
    return bundleId;
};

const deploySparkRepayOnPriceBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const repayOnPriceStrategy = createSparkRepayOnPriceStrategy();
    const flRepayOnPriceStrategy = createSparkFLRepayOnPriceStrategy();
    const continuous = false;
    const repayOnPriceStrategyId = await createStrategy(...repayOnPriceStrategy, continuous);
    const flRepayOnPriceStrategyId = await createStrategy(...flRepayOnPriceStrategy, continuous);
    const bundleId = await createBundle([repayOnPriceStrategyId, flRepayOnPriceStrategyId]);
    return bundleId;
};

const deploySparkBoostOnPriceBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const boostOnPriceStrategy = createSparkBoostOnPriceStrategy();
    const flBoostOnPriceStrategy = createSparkFLBoostOnPriceStrategy();
    const continuous = false;
    const boostOnPriceStrategyId = await createStrategy(...boostOnPriceStrategy, continuous);
    const flBoostOnPriceStrategyId = await createStrategy(...flBoostOnPriceStrategy, continuous);
    const bundleId = await createBundle([boostOnPriceStrategyId, flBoostOnPriceStrategyId]);
    return bundleId;
};

const openSparkProxyPosition = async (
    eoaAddr,
    proxy,
    collSymbol,
    debtSymbol,
    collAmountInUSD,
    debtAmountInUSD,
    marketAddress = null,
) => {
    const eoaSigner = await hre.ethers.getSigner(eoaAddr);
    const proxyAddr = proxy.address;

    const collAsset = getAssetInfo(collSymbol === 'ETH' ? 'WETH' : collSymbol, chainIds[network]);
    const debtAsset = getAssetInfo(debtSymbol === 'ETH' ? 'WETH' : debtSymbol, chainIds[network]);

    const collAmount = await fetchAmountInUSDPrice(collAsset.symbol, collAmountInUSD);
    const debtAmount = await fetchAmountInUSDPrice(debtAsset.symbol, debtAmountInUSD);

    // Set balance for EOA and approve proxy to spend
    await setBalance(collAsset.address, eoaAddr, collAmount);
    await approve(collAsset.address, proxyAddr, eoaSigner);

    // Get asset IDs from the pool
    const marketAddr = marketAddress || addrs[network].SPARK_MARKET;
    const sparkMarketContract = await hre.ethers.getContractAt(
        'IPoolAddressesProvider',
        marketAddr,
    );
    const poolAddress = await sparkMarketContract.getPool();
    const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
    const poolContract = await hre.ethers.getContractAt(poolContractName, poolAddress);
    const collReserveData = await poolContract.getReserveData(collAsset.address);
    const debtReserveData = await poolContract.getReserveData(debtAsset.address);

    // Use DFS actions to create position through proxy
    const supplyAction = new dfs.actions.spark.SparkSupplyAction(
        false,
        marketAddr,
        collAmount.toString(),
        eoaAddr,
        collAsset.address,
        collReserveData.id,
        true,
        true,
        proxyAddr,
    );
    const borrowAction = new dfs.actions.spark.SparkBorrowAction(
        false, // useDefaultMarket
        marketAddr, // marketAddr
        debtAmount.toString(), // amount
        eoaAddr, // send tokens to EOA
        2, // rateMode
        debtReserveData.id, // assetId (use reserve ID, not address)
        true, // useOnBehalf
        proxyAddr, // onBehalfAddr
    );
    const recipe = new dfs.Recipe('CreateSparkProxyPositionRecipe', [supplyAction, borrowAction]);

    const functionData = recipe.encodeForDsProxyCall()[1];

    await executeAction('RecipeExecutor', functionData, proxy);
    console.log('SparkProxyPosition opened');
};

const getSparkPositionRatio = async (userAddr, sparkViewParam, marketAddress = null) => {
    const marketAddr = marketAddress || addrs[network].SPARK_MARKET;

    let sparkView = sparkViewParam;
    if (!sparkView) {
        sparkView = await getContractFromRegistry('SparkView', isNetworkFork());
    }

    const ratio = await sparkView.getRatio(marketAddr, userAddr);
    return ratio;
};

const getSparkReserveDataFromPool = async (tokenAddress, market = null) => {
    const marketAddr = market || addrs[network].SPARK_MARKET;
    const sparkMarketContract = await hre.ethers.getContractAt(
        'IPoolAddressesProvider',
        marketAddr,
    );
    const poolAddress = await sparkMarketContract.getPool();
    const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
    const poolContract = await hre.ethers.getContractAt(poolContractName, poolAddress);
    const reserveData = await poolContract.getReserveData(tokenAddress);
    return reserveData;
};

const SPARK_AUTOMATION_TEST_PAIRS = [
    {
        collSymbol: 'WETH',
        debtSymbol: 'DAI',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioRepay: 165,
        targetRatioRepay: 225,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 20_000,
        repayAmountInUSD: 9_000,
    },
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDC',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioRepay: 165,
        targetRatioRepay: 225,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 20_000,
        repayAmountInUSD: 9_000,
    },
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDT',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioRepay: 165,
        targetRatioRepay: 225,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 20_000,
        repayAmountInUSD: 9_000,
    },
];

const SPARK_AUTOMATION_TEST_PAIRS_BOOST = [
    {
        collSymbol: 'WETH',
        debtSymbol: 'DAI',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioBoost: 190,
        targetRatioBoost: 180,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 15_000,
        boostAmountInUSD: 7_000,
    },
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDC',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioBoost: 190,
        targetRatioBoost: 180,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 15_000,
        boostAmountInUSD: 7_000,
    },
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDT',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioBoost: 190,
        targetRatioBoost: 180,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 15_000,
        boostAmountInUSD: 7_000,
    },
    {
        collSymbol: 'TBTC',
        debtSymbol: 'USDC',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioBoost: 190,
        targetRatioBoost: 170,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 15_000,
        boostAmountInUSD: 4_000,
    },
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDS',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioBoost: 190,
        targetRatioBoost: 185,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 15_000,
        boostAmountInUSD: 6_000,
    },
];

const SPARK_AUTOMATION_TEST_PAIRS_REPAY = [
    {
        collSymbol: 'WETH',
        debtSymbol: 'DAI',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioRepay: 165,
        targetRatioRepay: 225,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 20_000,
        repayAmountInUSD: 8_000,
    },
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDC',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioRepay: 165,
        targetRatioRepay: 225,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 20_000,
        repayAmountInUSD: 8_000,
    },
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDT',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioRepay: 165,
        targetRatioRepay: 225,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 20_000,
        repayAmountInUSD: 8_000,
    },
    {
        collSymbol: 'TBTC',
        debtSymbol: 'USDC',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioRepay: 165,
        targetRatioRepay: 220,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 20_000,
        repayAmountInUSD: 10_000,
    },
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDS',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioRepay: 200,
        targetRatioRepay: 240,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 20_000,
        repayAmountInUSD: 9_000,
    },
];

module.exports = {
    getSparkPositionInfo,
    expectTwoSparkPositionsToBeEqual,
    deploySparkCloseGenericBundle,
    deploySparkRepayOnPriceBundle,
    deploySparkBoostOnPriceBundle,
    openSparkProxyPosition,
    getSparkPositionRatio,
    getSparkReserveData,
    getSparkReserveDataFromPool,
    SPARK_AUTOMATION_TEST_PAIRS,
    SPARK_AUTOMATION_TEST_PAIRS_BOOST,
    SPARK_AUTOMATION_TEST_PAIRS_REPAY,
};
