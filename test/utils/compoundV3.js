const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');
const {
    createCompV3EOABoostL2Strategy,
    createCompV3BoostL2Strategy,
    createCompV3EOAFlBoostL2Strategy,
    createCompV3FLBoostL2Strategy,
    createCompV3EOARepayL2Strategy,
    createCompV3RepayL2Strategy,
    createCompV3EOAFlRepayL2Strategy,
    createCompV3FLRepayL2Strategy,
    createCompV3BoostOnPriceL2Strategy,
    createCompV3FLBoostOnPriceL2Strategy,
    createCompV3RepayOnPriceL2Strategy,
    createCompV3FLRepayOnPriceL2Strategy,
    createCompV3FLCloseToDebtL2Strategy,
    createCompV3FLCloseToCollL2Strategy,
} = require('../../strategies-spec/l2');

const {
    createCompV3BoostStrategy,
    createCompV3EOABoostStrategy,
    createCompV3EOAFlBoostStrategy,
    createCompV3FlBoostStrategy,
    createCompV3EOARepayStrategy,
    createCompV3RepayStrategy,
    createCompV3EOAFlRepayStrategy,
    createCompV3FlRepayStrategy,
    createCompV3BoostOnPriceStrategy,
    createCompV3FLBoostOnPriceStrategy,
    createCompV3RepayOnPriceStrategy,
    createCompV3FLRepayOnPriceStrategy,
    createCompV3FLCloseToDebtStrategy,
    createCompV3FLCloseToCollStrategy,
} = require('../../strategies-spec/mainnet');

const { createStrategy, createBundle } = require('../strategies/utils/utils-strategies');
const {
    network,
    openStrategyAndBundleStorage,
    isNetworkFork,
    chainIds,
    fetchAmountInUSDPrice,
    setBalance,
    approve,
    getContractFromRegistry,
} = require('./utils');
const { executeAction } = require('./actions');

const COMP_V3_MARKETS = {
    1: {
        USDC: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
        USDS: '0x5D409e56D886231aDAf00c8775665AD0f9897b56',
        USDT: '0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840',
        WETH: '0xA17581A9E3356d9A858b789D68B4d866e593aE94',
        wstETH: '0x3D0bb1ccaB520A66e607822fC55BC921738fAFE3',
    },
    42161: {
        USDC: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',
        USDCe: '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA',
        USDT: '0xd98Be00b5D27fc98112BdE293e487f8D4cA57d07',
        WETH: '0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486',
    },
    8453: {
        USDC: '0xb125E6687d4313864e53df431d5425969c15Eb2F',
        USDCbC: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',
        WETH: '0x46e6b214b524310239732D51387075E0e70970bf',
        AERO: '0x784efeB622244d2348d4F2522f8860B96fbEcE89',
        USDS: '0x2c776041CCFe903071AF44aa147368a9c8EEA518',
    },
    10: {
        USDC: '0x2e44e174f7D53F0212823acC11C01A11d58c5bCB',
        USDT: '0x995E394b8B2437aC8Ce61Ee0bC610D617962B214',
        WETH: '0xE36A30D249f7761327fd973001A32010b521b6Fd',
    },
};

const COMP_V3_AUTOMATION_TEST_PAIRS = {
    1: [
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
        },
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDS',
        },
        {
            collSymbol: 'WBTC',
            debtSymbol: 'WETH',
        },
    ],
    42161: [
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
        },
        {
            collSymbol: 'wBTC',
            debtSymbol: 'WETH',
        },
    ],
    8453: [
        {
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
        },
        {
            collSymbol: 'cbBTC',
            debtSymbol: 'WETH',
        },
    ],
};

const getSupportedAssets = async (compV3View) => {
    const assets = await compV3View.getAssets();
    return assets;
};

const deployCompV3BoostBundle = async (isEOA) => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const boostStrategy = isEOA
        ? isL2
            ? createCompV3EOABoostL2Strategy()
            : createCompV3EOABoostStrategy()
        : isL2
          ? createCompV3BoostL2Strategy()
          : createCompV3BoostStrategy();
    const flBoostStrategy = isEOA
        ? isL2
            ? createCompV3EOAFlBoostL2Strategy()
            : createCompV3EOAFlBoostStrategy()
        : isL2
          ? createCompV3FLBoostL2Strategy()
          : createCompV3FlBoostStrategy();
    const continuous = true;
    const boostStrategyId = await createStrategy(...boostStrategy, continuous);
    const flBoostStrategyId = await createStrategy(...flBoostStrategy, continuous);
    const bundleId = await createBundle([boostStrategyId, flBoostStrategyId]);
    return bundleId;
};

const deployCompV3RepayBundle = async (isEOA) => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const repayStrategy = isEOA
        ? isL2
            ? createCompV3EOARepayL2Strategy()
            : createCompV3EOARepayStrategy()
        : isL2
          ? createCompV3RepayL2Strategy()
          : createCompV3RepayStrategy();
    const flRepayStrategy = isEOA
        ? isL2
            ? createCompV3EOAFlRepayL2Strategy()
            : createCompV3EOAFlRepayStrategy()
        : isL2
          ? createCompV3FLRepayL2Strategy()
          : createCompV3FlRepayStrategy();
    const continuous = true;
    const repayStrategyId = await createStrategy(...repayStrategy, continuous);
    const flRepayStrategyId = await createStrategy(...flRepayStrategy, continuous);
    const bundleId = await createBundle([repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const deployCompV3BoostOnPriceBundle = async () => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const boostOnPriceStrategy = isL2
        ? createCompV3BoostOnPriceL2Strategy()
        : createCompV3BoostOnPriceStrategy();
    const flBoostOnPriceStrategy = isL2
        ? createCompV3FLBoostOnPriceL2Strategy()
        : createCompV3FLBoostOnPriceStrategy();
    const continuous = false;
    const boostOnPriceStrategyId = await createStrategy(...boostOnPriceStrategy, continuous);
    const flBoostOnPriceStrategyId = await createStrategy(...flBoostOnPriceStrategy, continuous);
    const bundleId = await createBundle([boostOnPriceStrategyId, flBoostOnPriceStrategyId]);
    return bundleId;
};

const deployCompV3RepayOnPriceBundle = async () => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const repayOnPriceStrategy = isL2
        ? createCompV3RepayOnPriceL2Strategy()
        : createCompV3RepayOnPriceStrategy();
    const flRepayOnPriceStrategy = isL2
        ? createCompV3FLRepayOnPriceL2Strategy()
        : createCompV3FLRepayOnPriceStrategy();
    const continuous = false;
    const repayOnPriceStrategyId = await createStrategy(...repayOnPriceStrategy, continuous);
    const flRepayOnPriceStrategyId = await createStrategy(...flRepayOnPriceStrategy, continuous);
    const bundleId = await createBundle([repayOnPriceStrategyId, flRepayOnPriceStrategyId]);
    return bundleId;
};

const deployCompV3CloseBundle = async () => {
    const isL2 = network !== 'mainnet';
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);
    const flCloseToDebtStrategy = isL2
        ? createCompV3FLCloseToDebtL2Strategy()
        : createCompV3FLCloseToDebtStrategy();
    const flCloseToCollStrategy = isL2
        ? createCompV3FLCloseToCollL2Strategy()
        : createCompV3FLCloseToCollStrategy();
    const continuous = false;
    const flCloseToDebtStrategyId = await createStrategy(...flCloseToDebtStrategy, continuous);
    const flCloseToCollStrategyId = await createStrategy(...flCloseToCollStrategy, continuous);
    const bundleId = await createBundle([flCloseToDebtStrategyId, flCloseToCollStrategyId]);
    return bundleId;
};

const openCompV3ProxyPosition = async (
    eoaAddr,
    proxy,
    marketSymbol,
    collSymbol,
    collAmountInUSD,
    debtAmountInUSD,
) => {
    const eoaSigner = await hre.ethers.getSigner(eoaAddr);
    const proxyAddr = proxy.address;

    const marketAddr = COMP_V3_MARKETS[chainIds[network]][marketSymbol];

    const collAsset = getAssetInfo(collSymbol === 'ETH' ? 'WETH' : collSymbol, chainIds[network]);
    const collAmount = await fetchAmountInUSDPrice(
        collSymbol === 'ETH' ? 'WETH' : collSymbol,
        collAmountInUSD,
    );
    const debtAmount = await fetchAmountInUSDPrice(
        marketSymbol === 'ETH' ? 'WETH' : marketSymbol,
        debtAmountInUSD,
    );

    await setBalance(collAsset.address, eoaAddr, collAmount);
    await approve(collAsset.address, proxyAddr, eoaSigner);

    const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        marketAddr,
        collAsset.address,
        collAmount.toString(),
        eoaAddr,
        proxyAddr,
    );
    const borrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
        marketAddr,
        debtAmount.toString(),
        eoaAddr,
        proxyAddr,
    );
    const recipe = new dfs.Recipe('CreateCompoundV3ProxyPositionRecipe', [
        supplyAction,
        borrowAction,
    ]);

    const functionData = recipe.encodeForDsProxyCall()[1];

    await executeAction('RecipeExecutor', functionData, proxy);
};

const openCompV3EOAPosition = async (
    eoaAddr,
    marketSymbol,
    collSymbol,
    collAmountInUSD,
    debtAmountInUSD,
) => {
    const eoaSigner = await hre.ethers.getSigner(eoaAddr);

    const marketAddr = COMP_V3_MARKETS[chainIds[network]][marketSymbol];

    const collAsset = getAssetInfo(collSymbol === 'ETH' ? 'WETH' : collSymbol, chainIds[network]);
    const borrowAsset = getAssetInfo(
        marketSymbol === 'ETH' ? 'WETH' : marketSymbol,
        chainIds[network],
    );

    const collAmount = await fetchAmountInUSDPrice(collAsset.symbol, collAmountInUSD);
    const debtAmount = await fetchAmountInUSDPrice(borrowAsset.symbol, debtAmountInUSD);

    await setBalance(collAsset.address, eoaAddr, collAmount);
    await approve(collAsset.address, marketAddr, eoaSigner);

    const cometContract = await hre.ethers.getContractAt('IComet', marketAddr, eoaSigner);

    await cometContract.supplyTo(eoaAddr, collAsset.address, collAmount.toString());
    await cometContract.withdrawFrom(eoaAddr, eoaAddr, borrowAsset.address, debtAmount.toString());
};

const addCompV3Manager = async (eoaAddr, managerToAdd, marketSymbol) => {
    const eoaSigner = await hre.ethers.getSigner(eoaAddr);

    const marketAddr = COMP_V3_MARKETS[chainIds[network]][marketSymbol];
    const cometContract = await hre.ethers.getContractAt('IComet', marketAddr, eoaSigner);

    await cometContract.allow(managerToAdd, true);
};

const getCompV3PositionRatio = async (marketSymbol, userAddr) => {
    const compV3RatioTrigger = await getContractFromRegistry('CompV3RatioTrigger', isNetworkFork());
    const triggerAddr = compV3RatioTrigger.address;
    const ratioHelper = await hre.ethers.getContractAt('CompV3RatioHelper', triggerAddr);

    const marketAddr = COMP_V3_MARKETS[chainIds[network]][marketSymbol];
    const ratio = await ratioHelper.getSafetyRatio(marketAddr, userAddr);

    return ratio;
};

module.exports = {
    COMP_V3_MARKETS,
    COMP_V3_AUTOMATION_TEST_PAIRS,
    getSupportedAssets,
    deployCompV3BoostBundle,
    deployCompV3RepayBundle,
    deployCompV3BoostOnPriceBundle,
    deployCompV3RepayOnPriceBundle,
    deployCompV3CloseBundle,
    openCompV3ProxyPosition,
    openCompV3EOAPosition,
    addCompV3Manager,
    getCompV3PositionRatio,
};
