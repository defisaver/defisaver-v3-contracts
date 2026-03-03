/* eslint-disable prettier/prettier */
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

const EOA_ACC_INDEX = 2;

const GIVER_POSITION_MANAGER = '0x8675fBc9B6F8F3097c4C151A7a4838AFE23AB020';
const TAKER_POSITION_MANAGER = '0x063A6DFe3a02Ae18afDF293c86c76A8A6665Cb60';
const CONFIG_POSITION_MANAGER = '0x22a0Ee581644f55E1deB487804Ec9b4188B41457';
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

const CORE_RESERVE_ID_USDC = 1;
const CORE_RESERVE_ID_WETH = 8;
const CORE_RESERVE_ID_USDT = 0;

const AAVE_V4_AUTOMATION_TEST_PAIRS = [
    {
        collSymbol: 'WETH',
        debtSymbol: 'USDC',
        collReserveId: CORE_RESERVE_ID_WETH,
        debtReserveId: CORE_RESERVE_ID_USDC,
        spoke: addrs[network].AAVE_V4_CORE_SPOKE,
        spokeName: 'CORE',
    },
];

const deployAndLogAllStrategiesAndBundles = async () => {
    const isFork = isNetworkFork();
    await openStrategyAndBundleStorage(isFork);

    const repayStrategy = createAaveV4RepayStrategy();
    const flRepayStrategy = createAaveV4FLRepayStrategy();
    const boostStrategy = createAaveV4BoostStrategy();
    const flBoostStrategy = createAaveV4FLBoostStrategy();
    const repayOnPriceStrategy = createAaveV4RepayOnPriceStrategy();
    const flRepayOnPriceStrategy = createAaveV4FLRepayOnPriceStrategy();
    const boostOnPriceStrategy = createAaveV4BoostOnPriceStrategy();
    const flBoostOnPriceStrategy = createAaveV4FLBoostOnPriceStrategy();
    const closeToDebtStrategy = createAaveV4FLCloseToDebtStrategy();
    const closeToCollStrategy = createAaveV4FLCloseToCollStrategy();
    const flCollateralSwitchStrategy = createAaveV4FLCollateralSwitchStrategy();

    const continuous = true;
    const nonContinuous = false;
    const repayStrategyId = await createStrategy(...repayStrategy, continuous);
    const flRepayStrategyId = await createStrategy(...flRepayStrategy, continuous);
    const boostStrategyId = await createStrategy(...boostStrategy, continuous);
    const flBoostStrategyId = await createStrategy(...flBoostStrategy, continuous);
    const repayOnPriceStrategyId = await createStrategy(...repayOnPriceStrategy, nonContinuous);
    const flRepayOnPriceStrategyId = await createStrategy(...flRepayOnPriceStrategy, nonContinuous);
    const boostOnPriceStrategyId = await createStrategy(...boostOnPriceStrategy, nonContinuous);
    const flBoostOnPriceStrategyId = await createStrategy(...flBoostOnPriceStrategy, nonContinuous);
    const closeToDebtStrategyId = await createStrategy(...closeToDebtStrategy, nonContinuous);
    const closeToCollStrategyId = await createStrategy(...closeToCollStrategy, nonContinuous);
    const flCollateralSwitchStrategyId = await createStrategy(
        ...flCollateralSwitchStrategy,
        nonContinuous,
    );
    const flEoaCollateralSwitchStrategyId = await createStrategy(
        ...flCollateralSwitchStrategy,
        nonContinuous,
    );

    const repayBundle = await createBundle([repayStrategyId, flRepayStrategyId]);
    const boostBundle = await createBundle([boostStrategyId, flBoostStrategyId]);
    const repayOnPriceBundle = await createBundle([
        repayOnPriceStrategyId,
        flRepayOnPriceStrategyId,
    ]);
    const boostOnPriceBundle = await createBundle([
        boostOnPriceStrategyId,
        flBoostOnPriceStrategyId,
    ]);
    const closeBundle = await createBundle([closeToDebtStrategyId, closeToCollStrategyId]);
    const eoaRepayBundle = await createBundle([repayStrategyId, flRepayStrategyId]);
    const eoaBoostBundle = await createBundle([boostStrategyId, flBoostStrategyId]);
    const eoaRepayOnPriceBundle = await createBundle([
        repayOnPriceStrategyId,
        flRepayOnPriceStrategyId,
    ]);
    const eoaBoostOnPriceBundle = await createBundle([
        boostOnPriceStrategyId,
        flBoostOnPriceStrategyId,
    ]);
    const eoaCloseBundle = await createBundle([closeToDebtStrategyId, closeToCollStrategyId]);

    console.log('AaveV4 Repay Bundle:', repayBundle);
    console.log('------AaveV4RepayStrategyID:', repayStrategyId);
    console.log('------AaveV4FLRepayStrategyID:', flRepayStrategyId);
    console.log('AaveV4 Boost Bundle:', boostBundle);
    console.log('------AaveV4BoostStrategyID:', boostStrategyId);
    console.log('------AaveV4FLBoostStrategyID:', flBoostStrategyId);
    console.log('AaveV4 Repay On Price Bundle:', repayOnPriceBundle);
    console.log('------AaveV4RepayOnPriceStrategyID:', repayOnPriceStrategyId);
    console.log('------AaveV4FLRepayOnPriceStrategyID:', flRepayOnPriceStrategyId);
    console.log('AaveV4 Boost On Price Bundle:', boostOnPriceBundle);
    console.log('------AaveV4BoostOnPriceStrategyID:', boostOnPriceStrategyId);
    console.log('------AaveV4FLBoostOnPriceStrategyID:', flBoostOnPriceStrategyId);
    console.log('AaveV4 Close Bundle:', closeBundle);
    console.log('------AaveV4CloseToDebtStrategyID:', closeToDebtStrategyId);
    console.log('------AaveV4CloseToCollStrategyID:', closeToCollStrategyId);
    console.log('AaveV4 FL Collateral Switch Strategy:', flCollateralSwitchStrategyId);
    console.log('/n');
    console.log('EOA Repay Bundle:', eoaRepayBundle);
    console.log('------AaveV4RepayStrategyID:', repayStrategyId);
    console.log('------AaveV4FLRepayStrategyID:', flRepayStrategyId);
    console.log('EOA Boost Bundle:', eoaBoostBundle);
    console.log('------AaveV4BoostStrategyID:', boostStrategyId);
    console.log('------AaveV4FLBoostStrategyID:', flBoostStrategyId);
    console.log('EOA Repay On Price Bundle:', eoaRepayOnPriceBundle);
    console.log('------AaveV4RepayOnPriceStrategyID:', repayOnPriceStrategyId);
    console.log('------AaveV4FLRepayOnPriceStrategyID:', flRepayOnPriceStrategyId);
    console.log('EOA Boost On Price Bundle:', eoaBoostOnPriceBundle);
    console.log('------AaveV4BoostOnPriceStrategyID:', boostOnPriceStrategyId);
    console.log('------AaveV4FLBoostOnPriceStrategyID:', flBoostOnPriceStrategyId);
    console.log('EOA Close Bundle:', eoaCloseBundle);
    console.log('------AaveV4CloseToDebtStrategyID:', closeToDebtStrategyId);
    console.log('------AaveV4CloseToCollStrategyID:', closeToCollStrategyId);
    console.log('EOA FL Collateral Switch Strategy:', flEoaCollateralSwitchStrategyId);
    console.log('/n');
};

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

const openAaveV4EoaPosition = async (
    eoaAddr,
    collReserveId,
    debtReserveId,
    collAmountInUSD,
    debtAmountInUSD,
    spoke = addrs[network].AAVE_V4_CORE_SPOKE,
) => {
    const eoaSigner = await hre.ethers.getSigner(eoaAddr);
    const spokeContract = await hre.ethers.getContractAt('ISpoke', spoke);

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
    await approve(collReserve.underlying, spoke, eoaSigner);

    await spokeContract.connect(eoaSigner).supply(collReserveId, collAmount, eoaAddr);
    await spokeContract.connect(eoaSigner).setUsingAsCollateral(collReserveId, true, eoaAddr);
    await spokeContract.connect(eoaSigner).borrow(debtReserveId, debtAmount, eoaAddr);
    console.log('AaveV4EoaPosition opened');
};

const enableAaveV4EoaPositionManagers = async (
    eoaSigner,
    proxyAddr,
    spoke,
    {
        approveBorrowReserveIds = [],
        approveWithdrawReserveIds = [],
        enableConfigManager = false,
    } = {},
) => {
    const spokeContract = await hre.ethers.getContractAt('ISpoke', spoke);

    await spokeContract.connect(eoaSigner).setUserPositionManager(GIVER_POSITION_MANAGER, true);

    const needsAllowanceManager =
        approveBorrowReserveIds.length > 0 || approveWithdrawReserveIds.length > 0;

    if (needsAllowanceManager) {
        await spokeContract.connect(eoaSigner).setUserPositionManager(TAKER_POSITION_MANAGER, true);

        const allowancePM = await hre.ethers.getContractAt(
            'ITakerPositionManager',
            TAKER_POSITION_MANAGER,
        );
        for (const reserveId of approveBorrowReserveIds) {
            await allowancePM
                .connect(eoaSigner)
                .approveBorrow(spoke, reserveId, proxyAddr, hre.ethers.constants.MaxUint256);
        }
        for (const reserveId of approveWithdrawReserveIds) {
            await allowancePM
                .connect(eoaSigner)
                .approveWithdraw(spoke, reserveId, proxyAddr, hre.ethers.constants.MaxUint256);
        }
    }

    if (enableConfigManager) {
        await spokeContract
            .connect(eoaSigner)
            .setUserPositionManager(CONFIG_POSITION_MANAGER, true);

        const configPM = await hre.ethers.getContractAt(
            'IConfigPositionManager',
            CONFIG_POSITION_MANAGER,
        );
        await configPM
            .connect(eoaSigner)
            .setCanUpdateUsingAsCollateralPermission(spoke, proxyAddr, true);
    }
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

const getAaveV4AssetPrice = async (spoke, assetId) => {
    const spokeContract = await hre.ethers.getContractAt('ISpoke', spoke);
    const oracleAddr = await spokeContract.ORACLE();
    const oracleContract = await hre.ethers.getContractAt('IAaveV4Oracle', oracleAddr);
    const price = await oracleContract.getReservePrice(assetId);
    return price;
};

const getUserSuppliedAmount = async (spoke, user, reserveId) => {
    const spokeContract = await hre.ethers.getContractAt('ISpoke', spoke);
    const userSuppliedAmount = await spokeContract.getUserSuppliedAssets(reserveId, user);
    return userSuppliedAmount;
};

module.exports = {
    EOA_ACC_INDEX,
    AAVE_V4_AUTOMATION_TEST_PAIRS,
    CORE_RESERVE_ID_USDT,
    deployAaveV4RepayBundle,
    deployAaveV4BoostBundle,
    deployAaveV4RepayOnPriceBundle,
    deployAaveV4BoostOnPriceBundle,
    deployAaveV4CloseBundle,
    deployAaveV4FLCollateralSwitchStrategy,
    getReserveData,
    openAaveV4ProxyPosition,
    openAaveV4EoaPosition,
    enableAaveV4EoaPositionManagers,
    redeployAaveV4Contracts,
    getUserAccountData,
    getSafetyRatio,
    getAaveV4AssetPrice,
    getUserSuppliedAmount,
    deployAndLogAllStrategiesAndBundles,
};
