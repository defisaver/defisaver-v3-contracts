/* eslint-disable prettier/prettier */
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');

const {
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

// AaveV4 Mainnet deployment addresses
// ===================================

// Position managers
const GIVER_POSITION_MANAGER = '0x8675fBc9B6F8F3097c4C151A7a4838AFE23AB020';
const TAKER_POSITION_MANAGER = '0x063A6DFe3a02Ae18afDF293c86c76A8A6665Cb60';
const CONFIG_POSITION_MANAGER = '0x22a0Ee581644f55E1deB487804Ec9b4188B41457';

// Hubs
const CORE_HUB = '0x3Ed2C9829FBCab6015E331a0352F8ae148217D70';
const PLUS_HUB = '0xcb8C80026248f92c6DE735264c23c8e22922C562';
const PRIME_HUB = '0xea40581231Ca775e6A3d7c129cF231D292B85f20';

// Spokes
const BLUECHIP_SPOKE = '0x637F9E189332a2821e5B046E2d7EEFae2405d6c5';
const ETHENA_SPOKE = '0xf3b207c235f6154120F41eB63D5ACCBAfD4086D1';
const ETHERFI_ESPOKE = '0x4054a9EbfcdB692599a8dF61eb0b3484F2d279D4';
const GOLD_SPOKE = '0x0DC7ccE912Afab8B49031A0A95DB74531741C2c4';
const LIDO_ESPOKE = '0x8aC76d950a3D03F9E1d857b5AAFFdA3f86C1e9AA';
const KELP_ESPOKE = '0x4D4a7b3Ce709b4362D7095a4A0105bDFDb5dA2a7';
const MAIN_SPOKE = '0x46539e9123A18c427e6b4DFF114c28CF405Cb023';

const HUBS = [CORE_HUB, PLUS_HUB, PRIME_HUB];
const SPOKES = [
    BLUECHIP_SPOKE,
    ETHENA_SPOKE,
    ETHERFI_ESPOKE,
    GOLD_SPOKE,
    LIDO_ESPOKE,
    KELP_ESPOKE,
    MAIN_SPOKE,
];

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
        spoke: MAIN_SPOKE,
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
    spoke = MAIN_SPOKE,
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
    spoke = MAIN_SPOKE,
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
            .setCanSetUsingAsCollateralPermission(spoke, proxyAddr, true);
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

const ALL_POSITION_MANAGER_UPDATES = [
    { positionManager: GIVER_POSITION_MANAGER, approve: true },
    { positionManager: TAKER_POSITION_MANAGER, approve: true },
    { positionManager: CONFIG_POSITION_MANAGER, approve: true },
];

const signSetUserManagersIntent = async (signer, spoke, updates) => {
    const spokeContract = await hre.ethers.getContractAt('ISpoke', spoke);
    const nonce = await spokeContract.nonces(signer.address, 0);
    const deadline = (await hre.ethers.provider.getBlock('latest')).timestamp + 3600;

    const domainResult = await spokeContract.eip712Domain();
    const domain = {
        name: domainResult[1],
        version: domainResult[2],
        chainId: domainResult[3],
        verifyingContract: domainResult[4],
    };

    const signature = await signer._signTypedData(
        domain,
        {
            SetUserPositionManagers: [
                { name: 'onBehalfOf', type: 'address' },
                { name: 'updates', type: 'PositionManagerUpdate[]' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
            PositionManagerUpdate: [
                { name: 'positionManager', type: 'address' },
                { name: 'approve', type: 'bool' },
            ],
        },
        {
            onBehalfOf: signer.address,
            updates,
            nonce,
            deadline,
        },
    );

    return { signature, nonce, deadline };
};

const signTakerPermit = async (signer, spoke, reserveId, spender, amount, typeName) => {
    const takerPM = await hre.ethers.getContractAt('ITakerPositionManager', TAKER_POSITION_MANAGER);
    const nonce = await takerPM.nonces(signer.address, 0);
    const deadline = (await hre.ethers.provider.getBlock('latest')).timestamp + 3600;

    const domainResult = await takerPM.eip712Domain();
    const domain = {
        name: domainResult[1],
        version: domainResult[2],
        chainId: domainResult[3],
        verifyingContract: domainResult[4],
    };

    const signature = await signer._signTypedData(
        domain,
        {
            [typeName]: [
                { name: 'spoke', type: 'address' },
                { name: 'reserveId', type: 'uint256' },
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'amount', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
        },
        {
            spoke,
            reserveId,
            owner: signer.address,
            spender,
            amount,
            nonce,
            deadline,
        },
    );

    return { signature, nonce, deadline };
};

const signBorrowPermit = (signer, spoke, reserveId, spender, amount) =>
    signTakerPermit(signer, spoke, reserveId, spender, amount, 'BorrowPermit');

const signWithdrawPermit = (signer, spoke, reserveId, spender, amount) =>
    signTakerPermit(signer, spoke, reserveId, spender, amount, 'WithdrawPermit');

module.exports = {
    EOA_ACC_INDEX,
    AAVE_V4_AUTOMATION_TEST_PAIRS,
    GIVER_POSITION_MANAGER,
    TAKER_POSITION_MANAGER,
    CONFIG_POSITION_MANAGER,
    HUBS,
    SPOKES,
    BLUECHIP_SPOKE,
    ETHENA_SPOKE,
    ETHERFI_ESPOKE,
    GOLD_SPOKE,
    LIDO_ESPOKE,
    KELP_ESPOKE,
    MAIN_SPOKE,
    CORE_HUB,
    PLUS_HUB,
    PRIME_HUB,
    ALL_POSITION_MANAGER_UPDATES,
    CORE_RESERVE_ID_USDC,
    CORE_RESERVE_ID_WETH,
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
    signSetUserManagersIntent,
    signBorrowPermit,
    signWithdrawPermit,
};
