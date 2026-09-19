// Shared helpers for the AaveV3 generic strategy tests in this folder
const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');
const automationSdk = require('@defisaver/automation-sdk');

const {
    getProxy,
    network,
    addrs,
    chainIds,
    takeSnapshot,
    revertToSnapshot,
    getContractFromRegistry,
    getStrategyExecutorContract,
    getAndSetMockExchangeWrapper,
    isNetworkFork,
    redeploy,
    sendEther,
} = require('../../../utils/utils');

const { addBotCaller } = require('../../utils/utils-strategies');
const {
    openAaveV3ProxyPosition,
    openAaveV3EOAPosition,
    setupAaveV3EOAPermissions,
} = require('../../../utils/aave');

// Recipe actions shared by every generic strategy bundle
const COMMON_REDEPLOYS = [
    'AaveV3Borrow',
    'AaveV3Payback',
    'AaveV3Supply',
    'AaveV3Withdraw',
    'AaveV3RatioCheck',
    'AaveV3OpenRatioCheck',
    'AaveV3View',
    'SubProxy',
];

// Both wallet types every strategy is tested with
const WALLET_TYPES = [
    { isEOA: false, label: 'SW' },
    { isEOA: true, label: 'EOA' },
];

// Price trigger configs that are always met, one per RatioState, so on-price
// strategies can execute right after subscribing
const PASSING_PRICE_TRIGGERS = [
    { state: 'UNDER', triggerPrice: 999_999, priceState: automationSdk.enums.RatioState.UNDER },
    { state: 'OVER', triggerPrice: 0, priceState: automationSdk.enums.RatioState.OVER },
];

// Sets up accounts, bot caller, mock exchange and FL address, redeploys the suite-specific
// contracts (triggers etc.) followed by the common recipe actions, then deploys the
// suite's bundle. Returns everything the tests need, incl. the redeployed contract
// instances keyed by name
const setupGenericTestEnv = async ({ extraRedeploys = [], deployBundleFn }) => {
    const isFork = isNetworkFork();
    await hre.network.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

    const senderAcc = (await hre.ethers.getSigners())[0];
    const botAcc = (await hre.ethers.getSigners())[1];
    await sendEther(senderAcc, addrs[network].OWNER_ACC, '10');
    const proxy = await getProxy(senderAcc.address);
    await addBotCaller(botAcc.address, isFork);
    const strategyExecutor = (await getStrategyExecutorContract()).connect(botAcc);
    const mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);
    const flAddr = (await getContractFromRegistry('FLAction', isFork)).address;

    const contracts = {};
    for (const name of [...extraRedeploys, ...COMMON_REDEPLOYS]) {
        contracts[name] = await redeploy(name, isFork);
    }

    const bundleId = await deployBundleFn();

    return {
        isFork,
        senderAcc,
        botAcc,
        proxy,
        strategyExecutor,
        mockWrapper,
        flAddr,
        bundleId,
        contracts,
    };
};

// Registers the snapshot-per-test hooks (call inside a describe block)
const useSnapshots = () => {
    let snapshotId;
    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });
};

// Opens an AaveV3 position for either wallet type. EOA positions also delegate
// permissions to the Smart Wallet address that executes the strategy
const openAaveV3TestPosition = async ({
    isEOA,
    senderAcc,
    proxy,
    collAsset,
    debtAsset,
    collAmountInUSD,
    debtAmountInUSD,
    marketAddress,
}) => {
    const openPosition = isEOA ? openAaveV3EOAPosition : openAaveV3ProxyPosition;
    await openPosition(
        senderAcc.address,
        proxy,
        collAsset.symbol,
        debtAsset.symbol,
        collAmountInUSD,
        debtAmountInUSD,
        marketAddress,
    );
    if (isEOA) {
        await setupAaveV3EOAPermissions(
            senderAcc.address,
            proxy.address,
            collAsset.address,
            debtAsset.address,
            marketAddress,
        );
    }
};

// Resolves a test pair into asset infos + a market name for test descriptions
const getTestPairInfo = (pair) => ({
    collAsset: getAssetInfo(
        pair.collSymbol === 'ETH' ? 'WETH' : pair.collSymbol,
        chainIds[network],
    ),
    debtAsset: getAssetInfo(
        pair.debtSymbol === 'ETH' ? 'WETH' : pair.debtSymbol,
        chainIds[network],
    ),
    marketName: pair.marketAddr === addrs[network].AAVE_MARKET ? 'Core Market' : 'Prime Market',
});

module.exports = {
    WALLET_TYPES,
    PASSING_PRICE_TRIGGERS,
    setupGenericTestEnv,
    useSnapshots,
    openAaveV3TestPosition,
    getTestPairInfo,
};
