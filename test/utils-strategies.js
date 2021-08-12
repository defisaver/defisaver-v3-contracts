const hre = require('hardhat');
const {
    getAddrFromRegistry,
    impersonateAccount,
    stopImpersonatingAccount,
    getGasUsed,
    OWNER_ACC,
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
const createStrategy = async (proxy, strategyName, triggerIds, actionIds, paramMapping) => {
    const strategyProxyAddr = await getAddrFromRegistry('StrategyProxy');

    const StrategyProxy = await hre.ethers.getContractFactory('StrategyProxy');

    const functionData = StrategyProxy.interface.encodeFunctionData(
        'createStrategy',
        [strategyName, triggerIds, actionIds, paramMapping],
    );

    const receipt = await proxy['execute(address,bytes)'](strategyProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed subTemplate; ${gasUsed}`);
};

const subToStrategy = async (proxy, strategyId, active, subData, triggerData) => {
    const SubProxyAddr = await getAddrFromRegistry('SubProxy');

    const SubProxyProxy = await hre.ethers.getContractFactory('SubProxy');
    const functionData = SubProxyProxy.interface.encodeFunctionData(
        'subscribeToStrategy',
        [strategyId, active, triggerData, subData],
    );

    const receipt = await proxy['execute(address,bytes)'](SubProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed createStrategy; ${gasUsed}`);

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
    getLatestStrategyId,
    getLatestSubId,
    addBotCaller,
};
