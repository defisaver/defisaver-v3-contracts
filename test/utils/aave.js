/* eslint-disable array-callback-return */
/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');

const {
    addrs,
    nullAddress,
    network,
    chainIds,
    fetchAmountInUSDPrice,
    setBalance,
    approve,
    getContractFromRegistry,
    isNetworkFork,
    openStrategyAndBundleStorage,
} = require('./utils');
const { executeAction } = require('./actions');

const {
    createAaveV3GenericBoostStrategy,
    createAaveV3GenericFLBoostStrategy,
    createAaveV3GenericRepayStrategy,
    createAaveV3GenericFLRepayStrategy,
    createAaveV3GenericBoostOnPriceStrategy,
    createAaveV3GenericFLBoostOnPriceStrategy,
    createAaveV3GenericRepayOnPriceStrategy,
    createAaveV3GenericFLRepayOnPriceStrategy,
    createAaveV3GenericFLCloseToDebtStrategy,
    createAaveV3GenericFLCloseToCollStrategy,
} = require('../../strategies-spec/mainnet');

const {
    createAaveV3GenericBoostL2Strategy,
    createAaveV3GenericFLBoostL2Strategy,
    createAaveV3GenericRepayL2Strategy,
    createAaveV3GenericFLRepayL2Strategy,
    createAaveV3GenericBoostOnPriceL2Strategy,
    createAaveV3GenericFLBoostOnPriceL2Strategy,
    createAaveV3GenericRepayOnPriceL2Strategy,
    createAaveV3GenericFLRepayOnPriceL2Strategy,
    createAaveV3GenericFLCloseToDebtL2Strategy,
    createAaveV3GenericFLCloseToCollL2Strategy,
} = require('../../strategies-spec/l2');

const { createStrategy, createBundle } = require('../strategies/utils/utils-strategies');

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

const AAVE_V3_AUTOMATION_TEST_PAIRS_BOOST = {
    1: [
        // Core Market pairs
        {
            collSymbol: 'WETH',
            debtSymbol: 'DAI',
            marketAddr: addrs[network].AAVE_MARKET,
            triggerRatioBoost: 190,
            targetRatioBoost: 180,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 15_000,
            boostAmountInUSD: 5_000,
        },
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
            marketAddr: addrs[network].AAVE_MARKET,
            triggerRatioBoost: 190,
            targetRatioBoost: 180,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 15_000,
            boostAmountInUSD: 5_000,
        },
        {
            collSymbol: 'WBTC',
            debtSymbol: 'USDC',
            marketAddr: addrs[network].AAVE_MARKET,
            triggerRatioBoost: 190,
            targetRatioBoost: 180,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 15_000,
            boostAmountInUSD: 2_500,
        },
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDT',
            marketAddr: addrs[network].AAVE_MARKET,
            triggerRatioBoost: 190,
            targetRatioBoost: 180,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 15_000,
            boostAmountInUSD: 5_000,
        },
        // Prime Market pairs
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
            marketAddr: addrs[network].AAVE_V3_PRIME_MARKET,
            triggerRatioBoost: 190,
            targetRatioBoost: 180,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 15_000,
            boostAmountInUSD: 5_000,
        },
        {
            collSymbol: 'WETH',
            debtSymbol: 'GHO',
            marketAddr: addrs[network].AAVE_V3_PRIME_MARKET,
            triggerRatioBoost: 190,
            targetRatioBoost: 180,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 15_000,
            boostAmountInUSD: 5_000,
        },
    ],
    // 42161: [
    //     {
    //         collSymbol: 'WETH',
    //         debtSymbol: 'USDC',
    //     },
    //     {
    //         collSymbol: 'WBTC',
    //         debtSymbol: 'USDC',
    //     },
    //     {
    //         collSymbol: 'WETH',
    //         debtSymbol: 'USDT',
    //     },
    // ],
    // 8453: [
    //     {
    //         collSymbol: 'WETH',
    //         debtSymbol: 'USDC',
    //     },
    //     {
    //         collSymbol: 'WBTC',
    //         debtSymbol: 'USDC',
    //     },
    // ],
    // 10: [
    //     {
    //         collSymbol: 'WETH',
    //         debtSymbol: 'USDC',
    //     },
    //     {
    //         collSymbol: 'WBTC',
    //         debtSymbol: 'USDC',
    //     },
    //     {
    //         collSymbol: 'WETH',
    //         debtSymbol: 'DAI',
    //     },
    // ],
};
const AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY = {
    1: [
        // Core Market pairs
        {
            collSymbol: 'WETH',
            debtSymbol: 'DAI',
            marketAddr: addrs[network].AAVE_MARKET,
            triggerRatioRepay: 165,
            targetRatioRepay: 225,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 20_000,
            repayAmountInUSD: 9_000,
        },
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
            marketAddr: addrs[network].AAVE_MARKET,
            triggerRatioRepay: 165,
            targetRatioRepay: 225,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 20_000,
            repayAmountInUSD: 9_000,
        },
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDT',
            marketAddr: addrs[network].AAVE_MARKET,
            triggerRatioRepay: 165,
            targetRatioRepay: 225,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 20_000,
            repayAmountInUSD: 9_000,
        },
        {
            collSymbol: 'WBTC',
            debtSymbol: 'USDC',
            marketAddr: addrs[network].AAVE_MARKET,
            triggerRatioRepay: 165,
            targetRatioRepay: 205,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 20_000,
            repayAmountInUSD: 9_000,
        },
        // Prime Market pairs
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
            marketAddr: addrs[network].AAVE_V3_PRIME_MARKET,
            triggerRatioRepay: 200,
            targetRatioRepay: 235,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 20_000,
            repayAmountInUSD: 9_000,
        },
        {
            collSymbol: 'WETH',
            debtSymbol: 'GHO',
            marketAddr: addrs[network].AAVE_V3_PRIME_MARKET,
            triggerRatioRepay: 200,
            targetRatioRepay: 235,
            collAmountInUSD: 40_000,
            debtAmountInUSD: 20_000,
            repayAmountInUSD: 9_000,
        },
    ],
    // 42161: [
    //     {
    //         collSymbol: 'WETH',
    //         debtSymbol: 'USDC',
    //     },
    //     {
    //         collSymbol: 'WBTC',
    //         debtSymbol: 'USDC',
    //     },
    //     {
    //         collSymbol: 'WETH',
    //         debtSymbol: 'USDT',
    //     },
    // ],
    // 8453: [
    //     {
    //         collSymbol: 'WETH',
    //         debtSymbol: 'USDC',
    //     },
    //     {
    //         collSymbol: 'WBTC',
    //         debtSymbol: 'USDC',
    //     },
    // ],
    // 10: [
    //     {
    //         collSymbol: 'WETH',
    //         debtSymbol: 'USDC',
    //     },
    //     {
    //         collSymbol: 'WBTC',
    //         debtSymbol: 'USDC',
    //     },
    //     {
    //         collSymbol: 'WETH',
    //         debtSymbol: 'DAI',
    //     },
    // ],
};

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
    const dataProvider = await hre.ethers.getContractAt('IAaveProtocolDataProvider', addrs[network].AAVE_V3_POOL_DATA_PROVIDER);
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
    const market = addrs[network].AAVE_MARKET;
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

const openAaveV3ProxyPosition = async (
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
    const marketAddr = marketAddress || addrs[network].AAVE_MARKET;
    const aaveMarketContract = await hre.ethers.getContractAt(
        'IPoolAddressesProvider',
        marketAddr,
    );
    const poolAddress = await aaveMarketContract.getPool();
    const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
    const poolContract = await hre.ethers.getContractAt(poolContractName, poolAddress);
    const collReserveData = await poolContract.getReserveData(collAsset.address);
    const debtReserveData = await poolContract.getReserveData(debtAsset.address);

    // Use DFS actions to create position through proxy
    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        false,
        marketAddr,
        collAmount.toString(),
        eoaAddr,
        collAsset.address,
        collReserveData.id,
        true,
        false,
        proxyAddr,
    );
    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        false, // useDefaultMarket
        marketAddr, // marketAddr
        debtAmount.toString(), // amount
        proxyAddr, // proxy
        VARIABLE_RATE, // rateMode
        debtReserveData.id, // assetId (use reserve ID, not address)
        false, // useOnBehalf
        proxyAddr, // onBehalfAddr
    );
    const recipe = new dfs.Recipe('CreateAaveV3ProxyPositionRecipe', [
        supplyAction,
        borrowAction,
    ]);

    const functionData = recipe.encodeForDsProxyCall()[1];

    await executeAction('RecipeExecutor', functionData, proxy);
    console.log('AaveV3ProxyPosition opened');
};

const openAaveV3EOAPosition = async (
    eoaAddr,
    collSymbol,
    debtSymbol,
    collAmountInUSD,
    debtAmountInUSD,
    marketAddress = null,
) => {
    const eoaSigner = await hre.ethers.getSigner(eoaAddr);

    const collAsset = getAssetInfo(collSymbol === 'ETH' ? 'WETH' : collSymbol, chainIds[network]);
    const debtAsset = getAssetInfo(debtSymbol === 'ETH' ? 'WETH' : debtSymbol, chainIds[network]);

    const collAmount = await fetchAmountInUSDPrice(collAsset.symbol, collAmountInUSD);
    const debtAmount = await fetchAmountInUSDPrice(debtAsset.symbol, debtAmountInUSD);

    // Use the passed market address or fall back to default
    const marketAddr = marketAddress || addrs[network].AAVE_MARKET;
    const aaveMarketContract = await hre.ethers.getContractAt(
        'IPoolAddressesProvider',
        marketAddr,
    );
    const poolAddress = await aaveMarketContract.getPool();

    // Use the appropriate interface based on network
    const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
    const poolContract = await hre.ethers.getContractAt(poolContractName, poolAddress, eoaSigner);

    // Set balance and approve pool contract
    await setBalance(collAsset.address, eoaAddr, collAmount);
    await approve(collAsset.address, poolAddress, eoaSigner);

    // Supply collateral directly to pool
    await poolContract.supply(collAsset.address, collAmount, eoaAddr, 0);

    // Borrow debt directly from pool
    await poolContract.borrow(debtAsset.address, debtAmount, VARIABLE_RATE, 0, eoaAddr);
};

const getAaveV3PositionRatio = async (userAddr, aaveV3ViewParam, marketAddress = null) => {
    const marketAddr = marketAddress || addrs[network].AAVE_MARKET;

    let aaveV3View = aaveV3ViewParam;
    if (!aaveV3View) {
        aaveV3View = await getContractFromRegistry('AaveV3View', isNetworkFork());
    }

    const ratio = await aaveV3View.getRatio(marketAddr, userAddr);
    return ratio;
};

const deployAaveV3BoostGenericBundle = async () => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    let boostStrategy;
    let flBoostStrategy;

    if (isL2) {
        boostStrategy = createAaveV3GenericBoostL2Strategy();
        flBoostStrategy = createAaveV3GenericFLBoostL2Strategy();
    } else {
        boostStrategy = createAaveV3GenericBoostStrategy();
        flBoostStrategy = createAaveV3GenericFLBoostStrategy();
    }

    const continuous = true;
    const boostStrategyId = await createStrategy(...boostStrategy, continuous);
    const flBoostStrategyId = await createStrategy(...flBoostStrategy, continuous);
    const bundleId = await createBundle([boostStrategyId, flBoostStrategyId]);
    return bundleId;
};

const deployAaveV3RepayGenericBundle = async () => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    let repayStrategy;
    let flRepayStrategy;

    if (isL2) {
        repayStrategy = createAaveV3GenericRepayL2Strategy();
        flRepayStrategy = createAaveV3GenericFLRepayL2Strategy();
    } else {
        repayStrategy = createAaveV3GenericRepayStrategy();
        flRepayStrategy = createAaveV3GenericFLRepayStrategy();
    }

    const continuous = true;
    const repayStrategyId = await createStrategy(...repayStrategy, continuous);
    const flRepayStrategyId = await createStrategy(...flRepayStrategy, continuous);
    const bundleId = await createBundle([repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const deployAaveV3BoostOnPriceGenericBundle = async () => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    let boostStrategy;
    let flBoostStrategy;

    if (isL2) {
        boostStrategy = createAaveV3GenericBoostOnPriceL2Strategy();
        flBoostStrategy = createAaveV3GenericFLBoostOnPriceL2Strategy();
    } else {
        boostStrategy = createAaveV3GenericBoostOnPriceStrategy();
        flBoostStrategy = createAaveV3GenericFLBoostOnPriceStrategy();
    }

    const continuous = false;
    const boostStrategyId = await createStrategy(...boostStrategy, continuous);
    const flBoostStrategyId = await createStrategy(...flBoostStrategy, continuous);
    const bundleId = await createBundle([boostStrategyId, flBoostStrategyId]);
    return bundleId;
};

const deployAaveV3RepayOnPriceGenericBundle = async () => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    let repayStrategy;
    let flRepayStrategy;

    if (isL2) {
        repayStrategy = createAaveV3GenericRepayOnPriceL2Strategy();
        flRepayStrategy = createAaveV3GenericFLRepayOnPriceL2Strategy();
    } else {
        repayStrategy = createAaveV3GenericRepayOnPriceStrategy();
        flRepayStrategy = createAaveV3GenericFLRepayOnPriceStrategy();
    }

    const continuous = false;
    const repayStrategyId = await createStrategy(...repayStrategy, continuous);
    const flRepayStrategyId = await createStrategy(...flRepayStrategy, continuous);
    const bundleId = await createBundle([repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const deployAaveV3CloseGenericBundle = async () => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const flCloseToDebtStrategy = isL2 ? createAaveV3GenericFLCloseToDebtL2Strategy() : createAaveV3GenericFLCloseToDebtStrategy();
    const flCloseToCollStrategy = isL2 ? createAaveV3GenericFLCloseToCollL2Strategy() : createAaveV3GenericFLCloseToCollStrategy();
    const continuous = false;
    const flCloseToDebtStrategyId = await createStrategy(...flCloseToDebtStrategy, continuous);
    const flCloseToCollStrategyId = await createStrategy(...flCloseToCollStrategy, continuous);
    const bundleId = await createBundle([flCloseToDebtStrategyId, flCloseToCollStrategyId]);
    return bundleId;
};

const setupAaveV3EOAPermissions = async (userAddress, smartWalletAddress, collTokenAddr, debtTokenAddr, marketAddress = null) => {
    console.log('Setting up AaveV3 EOA permissions...');
    console.log(`  - Collateral token: ${collTokenAddr}`);
    console.log(`  - Debt token: ${debtTokenAddr}`);

    // Get user signer
    const userSigner = await hre.ethers.getSigner(userAddress);
    // Get market addresses provider and actual pool
    const marketAddr = marketAddress || addrs[network].AAVE_MARKET;

    try {
        // Approve collateral token for Smart Wallet
        console.log(`  - Approving collateral token ${collTokenAddr} for Smart Wallet`);
        await approve(collTokenAddr, smartWalletAddress, userSigner);

        // Get aToken address and approve it for Smart Wallet (needed for PullTokenAction in repay strategies)
        const poolAddressesProvider = await hre.ethers.getContractAt('IPoolAddressesProvider', marketAddr);
        const poolAddress = await poolAddressesProvider.getPool();
        const lendingPool = await hre.ethers.getContractAt('IPoolV3', poolAddress);
        const collReserveData = await lendingPool.getReserveData(collTokenAddr);
        const aTokenAddr = collReserveData.aTokenAddress;

        console.log(`  - Approving aToken ${aTokenAddr} for Smart Wallet`);
        await approve(aTokenAddr, smartWalletAddress, userSigner);

        // Verify aToken balance and approval
        const aTokenContract = await hre.ethers.getContractAt('IERC20', aTokenAddr);
        const aTokenBalance = await aTokenContract.balanceOf(userAddress);
        const aTokenAllowance = await aTokenContract.allowance(userAddress, smartWalletAddress);
        console.log(`  - aToken balance: ${hre.ethers.utils.formatEther(aTokenBalance)}`);
        console.log(`  - aToken allowance: ${hre.ethers.utils.formatEther(aTokenAllowance)}`);

        // Get debt token address and delegate
        console.log(`  - Setting up debt delegation for ${debtTokenAddr}`);
        const reserveData = await lendingPool.getReserveData(debtTokenAddr);
        const variableDebtTokenAddress = reserveData.variableDebtTokenAddress;

        // Delegate debt token to Smart Wallet
        const debtToken = await hre.ethers.getContractAt('IDebtToken', variableDebtTokenAddress);
        console.log(`  - Delegating variable debt token ${variableDebtTokenAddress} to Smart Wallet`);
        console.log(`  - Debt token address: ${debtTokenAddr}`);
        console.log(`  - Variable debt token address: ${variableDebtTokenAddress}`);
        console.log(`  - User address: ${userAddress}`);
        console.log(`  - Smart Wallet address: ${smartWalletAddress}`);

        // Check current allowance
        const currentAllowance = await debtToken.borrowAllowance(userAddress, smartWalletAddress);
        console.log(`  - Current debt delegation allowance: ${hre.ethers.utils.formatEther(currentAllowance)}`);

        if (currentAllowance.lt(hre.ethers.constants.MaxUint256.div(2))) {
            const delegateTx = await debtToken.connect(userSigner).approveDelegation(smartWalletAddress, hre.ethers.constants.MaxUint256);
            await delegateTx.wait();

            // Verify the delegation worked
            const newAllowance = await debtToken.borrowAllowance(userAddress, smartWalletAddress);
            console.log(`  - New debt delegation allowance: ${hre.ethers.utils.formatEther(newAllowance)}`);

            // Double-check with a fresh contract instance
            const freshDebtToken = await hre.ethers.getContractAt('IDebtToken', variableDebtTokenAddress);
            const verifyAllowance = await freshDebtToken.borrowAllowance(userAddress, smartWalletAddress);
            console.log(`  - Verified debt delegation allowance: ${hre.ethers.utils.formatEther(verifyAllowance)}`);
        }

        console.log('AaveV3 EOA permissions setup completed successfully!');
    } catch (error) {
        console.log('Error setting up permissions:', error.message);
        throw error;
    }
};

const getAaveV3ReserveData = async (tokenAddress, market = null) => {
    const marketAddr = market || addrs[network].AAVE_MARKET;
    const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', marketAddr);
    const poolAddress = await aaveMarketContract.getPool();
    const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
    const poolContract = await hre.ethers.getContractAt(poolContractName, poolAddress);
    const reserveData = await poolContract.getReserveData(tokenAddress);
    return reserveData;
};

// Helper function to get enum name from value
const getCloseStrategyTypeName = (value) => {
    const enumNames = [
        'TAKE_PROFIT_IN_COLLATERAL',
        'STOP_LOSS_IN_COLLATERAL',
        'TAKE_PROFIT_IN_DEBT',
        'STOP_LOSS_IN_DEBT',
        'TAKE_PROFIT_AND_STOP_LOSS_IN_COLLATERAL',
        'TAKE_PROFIT_IN_COLLATERAL_AND_STOP_LOSS_IN_DEBT',
        'TAKE_PROFIT_AND_STOP_LOSS_IN_DEBT',
        'TAKE_PROFIT_IN_DEBT_AND_STOP_LOSS_IN_COLLATERAL',
    ];
    return enumNames[value] || `UNKNOWN_${value}`;
};

// Close strategy configurations for testing
const getAaveV3CloseStrategyConfigs = (automationSdk) => [
    // Take Profit Only - In Collateral (very high quote price = always triggers)
    {
        stopLossPrice: 0,
        stopLossType: null,
        takeProfitPrice: 1, // Minimal price - will always trigger
        takeProfitType: automationSdk.enums.CloseToAssetType.COLLATERAL,
    },
    // Stop Loss Only - In Collateral (very low quote price = always triggers)
    {
        stopLossPrice: 999_999 * 1e8, // Maximum price - will always trigger
        stopLossType: automationSdk.enums.CloseToAssetType.COLLATERAL,
        takeProfitPrice: 0,
        takeProfitType: null,
    },
    // Take Profit Only - In Debt
    {
        stopLossPrice: 0,
        stopLossType: null,
        takeProfitPrice: 1, // Minimal price - will always trigger
        takeProfitType: automationSdk.enums.CloseToAssetType.DEBT,
    },
    // Stop Loss Only - In Debt
    {
        stopLossPrice: 999_999 * 1e8, // Maximum price - will always trigger
        stopLossType: automationSdk.enums.CloseToAssetType.DEBT,
        takeProfitPrice: 0,
        takeProfitType: null,
    },
    // Both - In Collateral
    {
        stopLossPrice: 999_999 * 1e8, // Maximum price - will always trigger
        stopLossType: automationSdk.enums.CloseToAssetType.COLLATERAL,
        takeProfitPrice: 1, // Minimal price - will always trigger
        takeProfitType: automationSdk.enums.CloseToAssetType.COLLATERAL,
    },
    // Take Profit In Collateral, Stop Loss In Debt
    {
        stopLossPrice: 999_999 * 1e8, // Maximum price - will always trigger
        stopLossType: automationSdk.enums.CloseToAssetType.DEBT,
        takeProfitPrice: 1, // Minimal price - will always trigger
        takeProfitType: automationSdk.enums.CloseToAssetType.COLLATERAL,
    },
    // Both - In Debt
    {
        stopLossPrice: 999_999 * 1e8, // Maximum price - will always trigger
        stopLossType: automationSdk.enums.CloseToAssetType.DEBT,
        takeProfitPrice: 1, // Minimal price - will always trigger
        takeProfitType: automationSdk.enums.CloseToAssetType.DEBT,
    },
    // Take Profit In Debt, Stop Loss In Collateral
    {
        stopLossPrice: 999_999 * 1e8, // Maximum price - will always trigger
        stopLossType: automationSdk.enums.CloseToAssetType.COLLATERAL,
        takeProfitPrice: 1, // Minimal price - will always trigger
        takeProfitType: automationSdk.enums.CloseToAssetType.DEBT,
    },
];

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
    openAaveV3ProxyPosition,
    openAaveV3EOAPosition,
    getAaveV3PositionRatio,
    deployAaveV3BoostGenericBundle,
    deployAaveV3RepayGenericBundle,
    deployAaveV3BoostOnPriceGenericBundle,
    deployAaveV3RepayOnPriceGenericBundle,
    deployAaveV3CloseGenericBundle,
    setupAaveV3EOAPermissions,
    getAaveV3ReserveData,
    AAVE_V3_AUTOMATION_TEST_PAIRS_BOOST,
    AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY,
    aaveV2assetsDefaultMarket,
    AAVE_NO_DEBT_MODE,
    STABLE_RATE,
    VARIABLE_RATE,
    WETH_ASSET_ID_IN_AAVE_V3_MARKET,
    LUSD_ASSET_ID_IN_AAVE_V3_MARKET,
    WSETH_ASSET_ID_IN_AAVE_V3_MARKET,
    A_WETH_ADDRESS_V3,
    getCloseStrategyTypeName,
    getAaveV3CloseStrategyConfigs,
};
