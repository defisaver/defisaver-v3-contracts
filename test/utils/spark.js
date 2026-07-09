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
    setCode,
} = require('./utils');
const {
    createSparkGenericFLCloseToDebtStrategy,
    createSparkGenericFLCloseToCollStrategy,
    createSparkRepayOnPriceStrategy,
    createSparkFLRepayOnPriceStrategy,
    createSparkBoostOnPriceStrategy,
    createSparkFLBoostOnPriceStrategy,
    createSparkFLCollateralSwitchStrategy,
    createSparkGenericRepayStrategy,
    createSparkGenericFLRepayStrategy,
    createSparkGenericRepayOnPriceStrategy,
    createSparkGenericFLRepayOnPriceStrategy,
    createSparkGenericBoostStrategy,
    createSparkGenericFLBoostStrategy,
    createSparkGenericBoostOnPriceStrategy,
    createSparkGenericFLBoostOnPriceStrategy,
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

const openSparkEOAPosition = async (
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

    const marketAddr = marketAddress || addrs[network].SPARK_MARKET;
    const sparkMarketContract = await hre.ethers.getContractAt(
        'IPoolAddressesProvider',
        marketAddr,
    );
    const poolAddress = await sparkMarketContract.getPool();
    const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
    const poolContract = await hre.ethers.getContractAt(poolContractName, poolAddress, eoaSigner);
    const collReserveData = await poolContract.getReserveData(collAsset.address);
    const debtReserveData = await poolContract.getReserveData(debtAsset.address);

    await setBalance(collAsset.address, eoaAddr, collAmount);
    await approve(collAsset.address, proxyAddr, eoaSigner);

    // Delegate credit to proxy so proxy can borrow on behalf of EOA
    const debtTokenContract = await hre.ethers.getContractAt(
        'ISparkDebtToken',
        debtReserveData.variableDebtTokenAddress,
        eoaSigner,
    );
    await debtTokenContract.approveDelegation(proxyAddr, debtAmount);
    console.log('Spark debt token approved for delegation');

    const supplyAction = new dfs.actions.spark.SparkSupplyAction(
        false, // useDefaultMarket
        marketAddr, // marketAddr
        collAmount.toString(),
        eoaAddr, // from
        collAsset.address,
        collReserveData.id,
        true, // enableAsColl
        true, // useOnBehalf
        eoaAddr, // onBehalf
    );
    const borrowAction = new dfs.actions.spark.SparkBorrowAction(
        false, // useDefaultMarket
        marketAddr,
        debtAmount.toString(),
        eoaAddr, // send tokens to EOA
        2, // rateMode VARIABLE
        debtReserveData.id,
        true, // useOnBehalf
        eoaAddr, // onBehalf
    );
    const recipe = new dfs.Recipe('CreateSparkEOAPositionRecipe', [supplyAction, borrowAction]);
    const functionData = recipe.encodeForDsProxyCall()[1];

    await executeAction('RecipeExecutor', functionData, proxy);
    console.log('SparkEOAPosition opened');
};

const setupSparkEOAPermissions = async (
    userAddress,
    smartWalletAddress,
    collTokenAddr,
    debtTokenAddr,
    marketAddress = null,
) => {
    console.log('Setting up Spark EOA permissions...');

    const userSigner = await hre.ethers.getSigner(userAddress);
    const marketAddr = marketAddress || addrs[network].SPARK_MARKET;

    const poolAddressesProvider = await hre.ethers.getContractAt(
        'IPoolAddressesProvider',
        marketAddr,
    );
    const poolAddress = await poolAddressesProvider.getPool();
    const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
    const lendingPool = await hre.ethers.getContractAt(poolContractName, poolAddress);

    // Approve collateral asset for Smart Wallet
    await approve(collTokenAddr, smartWalletAddress, userSigner);

    // Approve spToken (aTokenAddress) for Smart Wallet — needed for PullToken in repay strategies
    const collReserveData = await lendingPool.getReserveData(collTokenAddr);
    const spTokenAddr = collReserveData.aTokenAddress;
    console.log(`  - Approving spToken ${spTokenAddr} for Smart Wallet`);
    await approve(spTokenAddr, smartWalletAddress, userSigner);

    // Delegate variable debt token to Smart Wallet — needed for borrow on behalf in boost/FL repay
    const debtReserveData = await lendingPool.getReserveData(debtTokenAddr);
    const variableDebtTokenAddress = debtReserveData.variableDebtTokenAddress;
    const debtToken = await hre.ethers.getContractAt(
        'ISparkDebtToken',
        variableDebtTokenAddress,
        userSigner,
    );
    await debtToken.approveDelegation(smartWalletAddress, hre.ethers.constants.MaxUint256);
    console.log(`  - Delegated variable debt token ${variableDebtTokenAddress} to Smart Wallet`);
};

/// @notice Replaces the Spark price oracle with a mock returning current prices.
/// @dev Spark's Chronicle/Aggor feeds revert (CanNotPickMedianOfEmptyArray) once
/// block.timestamp moves past their staleness window, which happens because
/// redeploy() time travels for the registry wait period. Call this BEFORE any
/// redeploys, while the real feeds are still fresh.
const mockSparkOracle = async (marketAddress = null) => {
    const marketAddr = marketAddress || addrs[network].SPARK_MARKET;
    const providerContract = await hre.ethers.getContractAt('IPoolAddressesProvider', marketAddr);
    const oracleAddr = await providerContract.getPriceOracle();
    const poolAddr = await providerContract.getPool();
    const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
    const poolContract = await hre.ethers.getContractAt(poolContractName, poolAddr);
    const reserves = await poolContract.getReservesList();

    // read prices while the real feeds are still fresh
    // NOTE: Chronicle-style feeds can be read-gated (tolled), so a plain eth_call
    // from an EOA may revert - retry with `from` set to the pool address.
    const oracleIface = new hre.ethers.utils.Interface([
        'function getAssetPrice(address) view returns (uint256)',
    ]);
    const readPrice = async (asset) => {
        const callData = oracleIface.encodeFunctionData('getAssetPrice', [asset]);
        // explicit gasLimit: default (60M) is above the EDR call gas cap (~16.7M)
        const gasLimit = 10_000_000;
        let result;
        try {
            result = await hre.ethers.provider.call({ to: oracleAddr, data: callData, gasLimit });
        } catch (e1) {
            result = await hre.ethers.provider.call({
                to: oracleAddr,
                data: callData,
                from: poolAddr,
                gasLimit,
            });
        }
        return oracleIface.decodeFunctionResult('getAssetPrice', result)[0];
    };

    const assets = [];
    const prices = [];
    for (let i = 0; i < reserves.length; i++) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const price = await readPrice(reserves[i]);
            assets.push(reserves[i]);
            prices.push(price);
        } catch (e) {
            console.log(`mockSparkOracle: skipping price for ${reserves[i]}: ${e.message}`);
        }
    }

    // replace oracle code with the mock and seed it with the fetched prices
    const mockBytecode =
        require('../../artifacts/contracts/mocks/MockSparkOracle.sol/MockSparkOracle.json').deployedBytecode;
    await setCode(oracleAddr, mockBytecode);

    const mockOracle = await hre.ethers.getContractAt('MockSparkOracle', oracleAddr);
    await mockOracle.setPrices(assets, prices);
    console.log(`Mocked Spark oracle at ${oracleAddr} with ${assets.length} asset prices`);
};

const deploySparkRepayGenericBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const repayStrategy = createSparkGenericRepayStrategy();
    const flRepayStrategy = createSparkGenericFLRepayStrategy();
    const continuous = true;
    const repayStrategyId = await createStrategy(...repayStrategy, continuous);
    const flRepayStrategyId = await createStrategy(...flRepayStrategy, continuous);
    const bundleId = await createBundle([repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const deploySparkBoostGenericBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const boostStrategy = createSparkGenericBoostStrategy();
    const flBoostStrategy = createSparkGenericFLBoostStrategy();
    const continuous = true;
    const boostStrategyId = await createStrategy(...boostStrategy, continuous);
    const flBoostStrategyId = await createStrategy(...flBoostStrategy, continuous);
    const bundleId = await createBundle([boostStrategyId, flBoostStrategyId]);
    return bundleId;
};
const deploySparkRepayOnPriceGenericBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const repayStrategy = createSparkGenericRepayOnPriceStrategy();
    const flRepayStrategy = createSparkGenericFLRepayOnPriceStrategy();
    const continuous = true;
    const repayStrategyId = await createStrategy(...repayStrategy, continuous);
    const flRepayStrategyId = await createStrategy(...flRepayStrategy, continuous);
    const bundleId = await createBundle([repayStrategyId, flRepayStrategyId]);
    return bundleId;
};
const deploySparkBoostOnPriceGenericBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const boostStrategy = createSparkGenericBoostOnPriceStrategy();
    const flBoostStrategy = createSparkGenericFLBoostOnPriceStrategy();
    const continuous = true;
    const boostStrategyId = await createStrategy(...boostStrategy, continuous);
    const flBoostStrategyId = await createStrategy(...flBoostStrategy, continuous);
    const bundleId = await createBundle([boostStrategyId, flBoostStrategyId]);
    return bundleId;
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
        collSymbol: 'WBTC',
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
        // must be above the opened position's ratio (~169% for 40k/20k on Spark,
        // WETH liq. threshold is higher than on AaveV3) so the repay trigger fires
        triggerRatioRepay: 175,
        targetRatioRepay: 225,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 20_000,
        repayAmountInUSD: 8_000,
    },
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDC',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioRepay: 175,
        targetRatioRepay: 225,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 20_000,
        repayAmountInUSD: 8_000,
    },
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDT',
        marketAddr: addrs[network].SPARK_MARKET,
        triggerRatioRepay: 175,
        targetRatioRepay: 225,
        collAmountInUSD: 40_000,
        debtAmountInUSD: 20_000,
        repayAmountInUSD: 8_000,
    },
    // NOTE: TBTC/USDC removed - TBTC reserve is frozen on SparkLend,
    // supply reverts regardless of our code. Re-add if/when unfrozen or pin an older block.
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

const deploySparkFLCollateralSwitchStrategy = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const flCollateralSwitchStrategy = createSparkFLCollateralSwitchStrategy();
    const continuous = false;
    const flCollateralSwitchStrategyId = await createStrategy(
        ...flCollateralSwitchStrategy,
        continuous,
    );
    return flCollateralSwitchStrategyId;
};

const SPARK_COLL_SWITCH_TEST_PAIRS = [
    // {
    //     fromAsset: 'WETH',
    //     toAsset: 'cbBTC',
    //     marketAddr: addrs[network].SPARK_MARKET,
    //     collAmountInUSD: 50_000,
    //     debtAmountInUSD: 25_000,
    //     amountToSwitchInUSD: 40_000,
    //     priceState: 1, // UNDER
    //     price: 1, // Trigger when 1 WETH < 1 cbBTC
    // },
    {
        fromAsset: 'WBTC',
        toAsset: 'WETH',
        marketAddr: addrs[network].SPARK_MARKET,
        collAmountInUSD: 50_000,
        debtAmountInUSD: 25_000,
        amountToSwitchInUSD: 40_000,
        priceState: 1, // UNDER
        price: 100, // 1 WBTC < 100 wstETH
    },
    {
        fromAsset: 'WBTC',
        toAsset: 'WETH',
        marketAddr: addrs[network].SPARK_MARKET,
        collAmountInUSD: 50_000,
        debtAmountInUSD: 25_000,
        amountToSwitchInUSD: hre.ethers.constants.MaxUint256,
        priceState: 0, // OVER
        price: 1, // Trigger when 1 WBTC > 1 WETH
    },
];

module.exports = {
    getSparkPositionInfo,
    expectTwoSparkPositionsToBeEqual,
    deploySparkCloseGenericBundle,
    deploySparkRepayOnPriceBundle,
    deploySparkBoostOnPriceBundle,
    openSparkProxyPosition,
    openSparkEOAPosition,
    setupSparkEOAPermissions,
    deploySparkRepayGenericBundle,
    deploySparkBoostGenericBundle,
    deploySparkRepayOnPriceGenericBundle,
    deploySparkBoostOnPriceGenericBundle,
    mockSparkOracle,
    getSparkPositionRatio,
    getSparkReserveData,
    getSparkReserveDataFromPool,
    SPARK_AUTOMATION_TEST_PAIRS,
    SPARK_AUTOMATION_TEST_PAIRS_BOOST,
    SPARK_AUTOMATION_TEST_PAIRS_REPAY,
    deploySparkFLCollateralSwitchStrategy,
    SPARK_COLL_SWITCH_TEST_PAIRS,
};
