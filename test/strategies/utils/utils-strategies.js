/* eslint-disable no-shadow */
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const {
    getAddrFromRegistry,
    impersonateAccount,
    stopImpersonatingAccount,
    getGasUsed,
    calcGasToUSD,
    AVG_GAS_PRICE,
    addrs,
    network,
    executeTxFromProxy,
    isProxyDSAProxy,
} = require('../../utils/utils');
const { executeAction } = require('../../utils/actions');

const getLatestBundleId = async () => {
    const bundleStorageAddr = await getAddrFromRegistry('BundleStorage');

    const bundleStorageInstance = await hre.ethers.getContractFactory('BundleStorage');
    const bundleStorage = await bundleStorageInstance.attach(bundleStorageAddr);

    let latestBundleId = await bundleStorage.getBundleCount();
    latestBundleId = (latestBundleId - 1).toString();

    return latestBundleId;
};

const getLatestStrategyId = async () => {
    const strategyStorageAddr = await getAddrFromRegistry('StrategyStorage');

    const strategyStorageInstance = await hre.ethers.getContractFactory('StrategyStorage');
    const strategyStorage = await strategyStorageInstance.attach(strategyStorageAddr);

    let latestStrategyId = await strategyStorage.getStrategyCount();
    latestStrategyId = (latestStrategyId - 1).toString();

    return latestStrategyId;
};

const getLatestSubId = async () => {
    const subStorageAddr = await getAddrFromRegistry('SubStorage');

    const subStorageInstance = await hre.ethers.getContractFactory('SubStorage');
    const subStorage = await subStorageInstance.attach(subStorageAddr);

    let latestSubId = await subStorage.getSubsCount();
    latestSubId = (latestSubId - 1).toString();

    return latestSubId;
};

const createStrategy = async (strategyName, triggerIds, actionIds, paramMapping, continuous) => {
    const storageAddr = await getAddrFromRegistry('StrategyStorage');
    const storage = await hre.ethers.getContractAt('StrategyStorage', storageAddr);
    const receipt = await storage.createStrategy(
        strategyName,
        triggerIds,
        actionIds,
        paramMapping,
        continuous,
        {
            gasLimit: 5000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed createStrategy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );

    const strategyId = await getLatestStrategyId();

    console.log('strategyId: ', strategyId);

    return strategyId;
};

const createBundle = async (strategyIds) => {
    const storageAddr = await getAddrFromRegistry('BundleStorage');
    const storage = await hre.ethers.getContractAt('BundleStorage', storageAddr);

    const receipt = await storage.createBundle(strategyIds, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed createBundle; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const latestBundleId = await getLatestBundleId();

    return latestBundleId;
};

const subToStrategy = async (proxy, strategySub) => {
    let receipt;

    // For DSA, subscription is performed inside a Recipe.
    const isDSAProxy = await isProxyDSAProxy(proxy);
    if (isDSAProxy) {
        const createSubRecipe = new dfs.Recipe('CreateSubRecipe', [
            new dfs.actions.basic.CreateSubAction(strategySub),
        ]);
        const functionData = createSubRecipe.encodeForDsProxyCall()[1];
        receipt = await executeAction('RecipeExecutor', functionData, proxy);
    } else {
        const SubProxyAddr = addrs[network].SubProxy;
        const SubProxyProxy = await hre.ethers.getContractFactory('SubProxy');
        const functionData = SubProxyProxy.interface.encodeFunctionData('subscribeToStrategy', [
            strategySub,
        ]);
        receipt = await executeTxFromProxy(proxy, SubProxyAddr, functionData);
    }

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(
        `GasUsed subToStrategy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );

    const latestSubId = await getLatestSubId();

    return latestSubId;
};

const activateSub = async (proxy, subId) => {
    const SubProxyAddr = await getAddrFromRegistry('SubProxy');

    const SubProxyProxy = await hre.ethers.getContractFactory('SubProxy');
    const functionData = SubProxyProxy.interface.encodeFunctionData('activateSub', [
        subId.toString(),
    ]);

    const receipt = await executeTxFromProxy(proxy, SubProxyAddr, functionData);

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed activateSub; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    return subId;
};

const addBotCaller = async (botAddr, isFork = false) => {
    if (!isFork) {
        await impersonateAccount(addrs[network].OWNER_ACC);
    }

    const signer = await hre.ethers.provider.getSigner(addrs[network].OWNER_ACC);
    const botAuthAddr = await getAddrFromRegistry('BotAuth');

    const botAuthInstance = await hre.ethers.getContractFactory('BotAuth', signer);
    let botAuth = await botAuthInstance.attach(botAuthAddr);

    botAuth = botAuth.connect(signer);

    await botAuth.addCaller(botAddr, { gasLimit: 800000 });

    if (!isFork) {
        await stopImpersonatingAccount(addrs[network].OWNER_ACC);
    }
};

const setMCDPriceVerifier = async (triggerAddr) => {
    const oldOwner = '0x0528A32fda5beDf89Ba9ad67296db83c9452F28C';
    await impersonateAccount(oldOwner);

    const signer = await hre.ethers.provider.getSigner(oldOwner);

    let mcdPriceVerifier = await hre.ethers.getContractAt(
        'IMCDPriceVerifier',
        '0xeAa474cbFFA87Ae0F1a6f68a3aBA6C77C656F72c',
    );

    mcdPriceVerifier = mcdPriceVerifier.connect(signer);

    await mcdPriceVerifier.setAuthorized(triggerAddr, true);

    await stopImpersonatingAccount(oldOwner);
};

const getSubHash = (subData) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();

    const encodedSubData = abiCoder.encode(['(uint256,bool,bytes[],bytes32[])'], [subData]);
    const subDataHash = hre.ethers.utils.keccak256(encodedSubData);

    return subDataHash;
};

const getUpdatedStrategySub = async (subStorage, subStorageAddr) => {
    const events = await subStorage.queryFilter({
        address: subStorageAddr,
        topics: [
            hre.ethers.utils.id('UpdateData(uint256,bytes32,(uint64,bool,bytes[],bytes32[]))'),
        ],
    });

    const lastEvent = events.at(-1);

    const abiCoder = hre.ethers.utils.defaultAbiCoder;
    const strategySub = abiCoder.decode(['(uint64,bool,bytes[],bytes32[])'], lastEvent.data)[0];

    return strategySub;
};

module.exports = {
    subToStrategy,
    activateSub,
    createStrategy,
    createBundle,
    getLatestStrategyId,
    getLatestBundleId,
    getLatestSubId,
    addBotCaller,
    setMCDPriceVerifier,
    getSubHash,
    getUpdatedStrategySub,
};
