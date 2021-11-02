const hre = require('hardhat');
const {
    getAddrFromRegistry,
    impersonateAccount,
    stopImpersonatingAccount,
    getGasUsed,
    calcGasToUSD,
    OWNER_ACC,
    AVG_GAS_PRICE,
} = require('./utils');

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

// eslint-disable-next-line max-len
const createStrategy = async (proxy, strategyName, triggerIds, actionIds, paramMapping, continuous) => {
    const strategyProxyAddr = await getAddrFromRegistry('StrategyProxy');

    const StrategyProxy = await hre.ethers.getContractFactory('StrategyProxy');

    const functionData = StrategyProxy.interface.encodeFunctionData(
        'createStrategy',
        [strategyName, triggerIds, actionIds, paramMapping, continuous],
    );

    console.log('Create strategy');

    const receipt = await proxy['execute(address,bytes)'](strategyProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed createStrategy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

const createBundle = async (proxy, strategyIds) => {
    const strategyProxyAddr = await getAddrFromRegistry('StrategyProxy');

    const StrategyProxy = await hre.ethers.getContractFactory('StrategyProxy');

    const functionData = StrategyProxy.interface.encodeFunctionData(
        'createBundle',
        [strategyIds],
    );

    const receipt = await proxy['execute(address,bytes)'](strategyProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed createBundle; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

const subToStrategy = async (proxy, strategyId, active, subData, triggerData, isBundle = false) => {
    const SubProxyAddr = await getAddrFromRegistry('SubProxy');

    const SubProxyProxy = await hre.ethers.getContractFactory('SubProxy');
    const functionData = SubProxyProxy.interface.encodeFunctionData(
        'subscribeToStrategy',
        [strategyId, active, triggerData, subData, isBundle],
    );

    const receipt = await proxy['execute(address,bytes)'](SubProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed subToStrategy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const latestStrategyId = await getLatestSubId();

    return latestStrategyId;
};

const addBotCaller = async (botAddr) => {
    await impersonateAccount(OWNER_ACC);

    const signer = await hre.ethers.provider.getSigner(OWNER_ACC);
    const botAuthAddr = await getAddrFromRegistry('BotAuth');

    const botAuthInstance = await hre.ethers.getContractFactory('BotAuth', signer);
    let botAuth = await botAuthInstance.attach(botAuthAddr);

    botAuth = botAuth.connect(signer);

    await botAuth.addCaller(botAddr);

    await stopImpersonatingAccount(OWNER_ACC);
};

module.exports = {
    subToStrategy,
    createStrategy,
    createBundle,
    getLatestStrategyId,
    getLatestSubId,
    addBotCaller,
};
