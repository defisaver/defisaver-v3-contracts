/* eslint-disable array-callback-return */
/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');

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

const {
    createAaveV3BoostStrategy,
    createAaveV3FLBoostStrategy,
    createAaveV3RepayStrategy,
    createAaveV3FLRepayStrategy,
    createAaveV3EOABoostStrategy,
    createAaveV3EOAFLBoostStrategy,
    createAaveV3EOARepayStrategy,
    createAaveV3EOAFLRepayStrategy,
} = require('../../strategies-spec/mainnet');

const {
    createAaveV3BoostL2Strategy,
    createAaveV3FLBoostL2Strategy,
    createAaveV3RepayL2Strategy,
    createAaveV3FLRepayL2Strategy,
    createAaveV3EOABoostL2Strategy,
    createAaveV3EOAFLBoostL2Strategy,
    createAaveV3EOARepayL2Strategy,
    createAaveV3EOAFLRepayL2Strategy,
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

const AAVE_V3_AUTOMATION_TEST_PAIRS = {
    1: [
        {
            collSymbol: 'WETH',
            debtSymbol: 'DAI',
        },
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
        },
        {
            collSymbol: 'WBTC',
            debtSymbol: 'USDC',
        },
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDT',
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

const openAaveV3EOAPosition = async (
    proxy,
    eoaAddr,
    collSymbol,
    debtSymbol,
    collAmountInUSD,
    debtAmountInUSD,
) => {
    const senderAcc = await hre.ethers.getSigner(eoaAddr);

    const collAsset = getAssetInfo(collSymbol === 'ETH' ? 'WETH' : collSymbol, chainIds[network]);
    const debtAsset = getAssetInfo(debtSymbol === 'ETH' ? 'WETH' : debtSymbol, chainIds[network]);

    const collAmount = await fetchAmountInUSDPrice(collAsset.symbol, collAmountInUSD);
    const debtAmount = await fetchAmountInUSDPrice(debtAsset.symbol, debtAmountInUSD);

    // Get the pool address from the market provider
    const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
    const poolAddress = await aaveMarketContract.getPool();

    // Use the appropriate interface based on network
    const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
    const poolContract = await hre.ethers.getContractAt(poolContractName, poolAddress, senderAcc);

    // Set balance and approve pool contract
    await setBalance(collAsset.address, eoaAddr, collAmount);
    await approve(collAsset.address, poolAddress, senderAcc);

    // Supply collateral directly to pool
    await poolContract.supply(collAsset.address, collAmount, eoaAddr, 0);

    // Borrow debt directly from pool (rate mode 2 = variable)
    await poolContract.borrow(debtAsset.address, debtAmount, VARIABLE_RATE, 0, eoaAddr);
};

const getAaveV3PositionRatio = async (userAddr, aaveV3ViewParam) => {
    const marketAddr = addrs[network].AAVE_MARKET;

    let aaveV3View = aaveV3ViewParam;
    if (!aaveV3View) {
        aaveV3View = await getContractFromRegistry('AaveV3View', isNetworkFork());
    }

    const ratio = await aaveV3View.getRatio(marketAddr, userAddr);
    console.log('RATIO IS THIS ->>>', ratio);
    return ratio;
};

const deployAaveV3BoostBundle = async (isEOA) => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    let boostStrategy;
    let flBoostStrategy;

    if (isEOA) {
        if (isL2) {
            boostStrategy = createAaveV3EOABoostL2Strategy();
            flBoostStrategy = createAaveV3EOAFLBoostL2Strategy();
        } else {
            boostStrategy = createAaveV3EOABoostStrategy();
            flBoostStrategy = createAaveV3EOAFLBoostStrategy();
        }
    } else if (isL2) {
        boostStrategy = createAaveV3BoostL2Strategy();
        flBoostStrategy = createAaveV3FLBoostL2Strategy();
    } else {
        boostStrategy = createAaveV3BoostStrategy();
        flBoostStrategy = createAaveV3FLBoostStrategy();
    }

    const continuous = true;
    const boostStrategyId = await createStrategy(...boostStrategy, continuous);
    const flBoostStrategyId = await createStrategy(...flBoostStrategy, continuous);
    const bundleId = await createBundle([boostStrategyId, flBoostStrategyId]);
    console.log('CREATED BUNDLE !!!!', bundleId);
    return bundleId;
};

const deployAaveV3RepayBundle = async (isEOA) => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    let repayStrategy;
    let flRepayStrategy;

    // TODO -> Fix this
    if (isEOA) {
        if (isL2) {
            repayStrategy = createAaveV3EOARepayL2Strategy();
            flRepayStrategy = createAaveV3EOAFLRepayL2Strategy();
        } else {
            repayStrategy = createAaveV3EOARepayStrategy();
            flRepayStrategy = createAaveV3EOAFLRepayStrategy();
        }
    } else if (isL2) {
        repayStrategy = createAaveV3RepayL2Strategy();
        flRepayStrategy = createAaveV3FLRepayL2Strategy();
    } else {
        repayStrategy = createAaveV3RepayStrategy();
        flRepayStrategy = createAaveV3FLRepayStrategy();
    }

    const continuous = true;
    const repayStrategyId = await createStrategy(...repayStrategy, continuous);
    const flRepayStrategyId = await createStrategy(...flRepayStrategy, continuous);
    const bundleId = await createBundle([repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const setupAaveV3EOAPermissions = async (userAddress, smartWalletAddress, collTokenAddr, debtTokenAddr) => {
    console.log('Setting up AaveV3 EOA permissions...');
    console.log(`  - Collateral token: ${collTokenAddr}`);
    console.log(`  - Debt token: ${debtTokenAddr}`);

    // Get user signer
    const userSigner = await hre.ethers.getSigner(userAddress);
    // Get market addresses provider and actual pool
    const marketAddr = addrs[network].AAVE_MARKET;

    try {
        // Approve collateral token for Smart Wallet
        console.log(`  - Approving collateral token ${collTokenAddr} for Smart Wallet`);
        await approve(collTokenAddr, smartWalletAddress, userSigner);

        // Get debt token address and delegate
        console.log(`  - Setting up debt delegation for ${debtTokenAddr}`);
        const poolAddressesProvider = await hre.ethers.getContractAt('IPoolAddressesProvider', marketAddr);
        const poolAddress = await poolAddressesProvider.getPool();
        const lendingPool = await hre.ethers.getContractAt('IPoolV3', poolAddress);
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
    openAaveV3EOAPosition,
    getAaveV3PositionRatio,
    deployAaveV3BoostBundle,
    deployAaveV3RepayBundle,
    setupAaveV3EOAPermissions,
    AAVE_V3_AUTOMATION_TEST_PAIRS,
    aaveV2assetsDefaultMarket,
    AAVE_NO_DEBT_MODE,
    STABLE_RATE,
    VARIABLE_RATE,
    WETH_ASSET_ID_IN_AAVE_V3_MARKET,
    LUSD_ASSET_ID_IN_AAVE_V3_MARKET,
    WSETH_ASSET_ID_IN_AAVE_V3_MARKET,
    A_WETH_ADDRESS_V3,
};
