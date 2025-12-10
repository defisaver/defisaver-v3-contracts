const hre = require('hardhat');
const dfs = require('@defisaver/sdk');

const {
    addrs,
    network,
    setBalance,
    approve,
    isNetworkFork,
    openStrategyAndBundleStorage,
    redeploy,
    fetchAmountInUSDPriceByAddress,
} = require('./utils');
const { executeAction } = require('./actions');

const { createStrategy, createBundle } = require('../strategies/utils/utils-strategies');
const {
    createAaveV4RepayStrategy,
    createAaveV4FLRepayStrategy,
    createAaveV4BoostStrategy,
    createAaveV4FLBoostStrategy,
    createAaveV4RepayOnPriceStrategy,
    createAaveV4FLRepayOnPriceStrategy,
    createAaveV4BoostOnPriceStrategy,
    createAaveV4FLBoostOnPriceStrategy,
    createAaveV4FLCollateralSwitchStrategy,
    createAaveV4FLCloseToDebtStrategy,
    createAaveV4FLCloseToCollStrategy,
} = require('../../strategies-spec/mainnet');

const CORE_RESERVE_ID_USDC = 5;
const CORE_RESERVE_ID_WETH = 0;

const AAVE_V4_AUTOMATION_TEST_PAIRS = [
    {
        collSymbol: 'USDC',
        debtSymbol: 'WETH',
        collReserveId: CORE_RESERVE_ID_USDC,
        debtReserveId: CORE_RESERVE_ID_WETH,
        spoke: addrs[network].AAVE_V4_CORE_SPOKE,
        spokeName: 'CORE',
    },
];

const deployAaveV4RepayBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    const repayStrategy = createAaveV4RepayStrategy();
    const flRepayStrategy = createAaveV4FLRepayStrategy();
    const continuous = true;
    const repayStrategyId = await createStrategy(...repayStrategy, continuous);
    const flRepayStrategyId = await createStrategy(...flRepayStrategy, continuous);
    const bundleId = await createBundle([repayStrategyId, flRepayStrategyId]);

    return bundleId;
};

const deployAaveV4BoostBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    const boostStrategy = createAaveV4BoostStrategy();
    const flBoostStrategy = createAaveV4FLBoostStrategy();
    const continuous = true;
    const boostStrategyId = await createStrategy(...boostStrategy, continuous);
    const flBoostStrategyId = await createStrategy(...flBoostStrategy, continuous);
    const bundleId = await createBundle([boostStrategyId, flBoostStrategyId]);

    return bundleId;
};

const deployAaveV4RepayOnPriceBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    const repayOnPriceStrategy = createAaveV4RepayOnPriceStrategy();
    const flRepayOnPriceStrategy = createAaveV4FLRepayOnPriceStrategy();
    const continuous = false;
    const repayOnPriceStrategyId = await createStrategy(...repayOnPriceStrategy, continuous);
    const flRepayOnPriceStrategyId = await createStrategy(...flRepayOnPriceStrategy, continuous);
    const bundleId = await createBundle([repayOnPriceStrategyId, flRepayOnPriceStrategyId]);

    return bundleId;
};

const deployAaveV4BoostOnPriceBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    const boostOnPriceStrategy = createAaveV4BoostOnPriceStrategy();
    const flBoostOnPriceStrategy = createAaveV4FLBoostOnPriceStrategy();
    const continuous = false;
    const boostOnPriceStrategyId = await createStrategy(...boostOnPriceStrategy, continuous);
    const flBoostOnPriceStrategyId = await createStrategy(...flBoostOnPriceStrategy, continuous);
    const bundleId = await createBundle([boostOnPriceStrategyId, flBoostOnPriceStrategyId]);

    return bundleId;
};

const deployAaveV4CloseBundle = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    const closeToDebtStrategy = createAaveV4FLCloseToDebtStrategy();
    const closeToCollStrategy = createAaveV4FLCloseToCollStrategy();
    const continuous = false;
    const closeToDebtStrategyId = await createStrategy(...closeToDebtStrategy, continuous);
    const closeToCollStrategyId = await createStrategy(...closeToCollStrategy, continuous);
    const bundleId = await createBundle([closeToDebtStrategyId, closeToCollStrategyId]);

    return bundleId;
};

const deployAaveV4FLCollateralSwitchStrategy = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    const flSwitchStrategy = createAaveV4FLCollateralSwitchStrategy();
    const continuous = false;
    const flCollateralSwitchStrategyId = await createStrategy(...flSwitchStrategy, continuous);

    return flCollateralSwitchStrategyId;
};

const getReserveData = async (spoke, reserveId) => {
    const spokeContract = await hre.ethers.getContractAt('ISpoke', spoke);
    const reserve = await spokeContract.getReserve(reserveId);
    return reserve;
};

const openAaveV4ProxyPosition = async (
    proxy,
    eoaAddr,
    collReserveId,
    debtReserveId,
    collAmountInUSD,
    debtAmountInUSD,
    spoke = addrs[network].AAVE_V4_CORE_SPOKE,
) => {
    const eoaSigner = await hre.ethers.getSigner(eoaAddr);
    const proxyAddr = proxy.address;

    const collReserve = await getReserveData(spoke, collReserveId);
    const debtReserve = await getReserveData(spoke, debtReserveId);

    const collAmount = await fetchAmountInUSDPriceByAddress(
        collReserve.underlying,
        collReserve.decimals,
        collAmountInUSD,
    );
    const debtAmount = await fetchAmountInUSDPriceByAddress(
        debtReserve.underlying,
        debtReserve.decimals,
        debtAmountInUSD,
    );

    await setBalance(collReserve.underlying, eoaAddr, collAmount);
    await approve(collReserve.underlying, proxyAddr, eoaSigner);

    const supplyAction = new dfs.actions.aaveV4.AaveV4SupplyAction(
        spoke,
        proxyAddr,
        eoaAddr,
        collReserveId,
        collAmount.toString(),
        true,
    );
    const borrowAction = new dfs.actions.aaveV4.AaveV4BorrowAction(
        spoke,
        proxyAddr,
        eoaAddr,
        debtReserveId,
        debtAmount.toString(),
    );
    const recipe = new dfs.Recipe('OpenAaveV4ProxyPositionRecipe', [supplyAction, borrowAction]);
    const functionData = recipe.encodeForDsProxyCall()[1];
    await executeAction('RecipeExecutor', functionData, proxy);
    console.log('AaveV4ProxyPosition opened');
};

const redeployAaveV4Contracts = async () => {
    const isFork = isNetworkFork();
    await redeploy('AaveV4Supply', isFork);
    await redeploy('AaveV4Borrow', isFork);
    await redeploy('AaveV4Payback', isFork);
    await redeploy('AaveV4Withdraw', isFork);
    await redeploy('AaveV4CollateralSwitch', isFork);
    await redeploy('AaveV4StoreRatio', isFork);
    await redeploy('AaveV4RatioCheck', isFork);
    await redeploy('AaveV4RatioTrigger', isFork);
    await redeploy('AaveV4QuotePriceTrigger', isFork);
    await redeploy('AaveV4QuotePriceRangeTrigger', isFork);
    await redeploy('AaveV4View', isFork);
};

const getUserAccountData = async (spoke, user) => {
    const spokeContract = await hre.ethers.getContractAt('ISpoke', spoke);
    const userAccountData = await spokeContract.getUserAccountData(user);
    return userAccountData;
};

const getSafetyRatio = async (spoke, user) => {
    const userAccountData = await getUserAccountData(spoke, user);
    return userAccountData.healthFactor;
};

module.exports = {
    AAVE_V4_AUTOMATION_TEST_PAIRS,
    deployAaveV4RepayBundle,
    deployAaveV4BoostBundle,
    deployAaveV4RepayOnPriceBundle,
    deployAaveV4BoostOnPriceBundle,
    deployAaveV4CloseBundle,
    deployAaveV4FLCollateralSwitchStrategy,
    getReserveData,
    openAaveV4ProxyPosition,
    redeployAaveV4Contracts,
    getUserAccountData,
    getSafetyRatio,
};
