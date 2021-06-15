const hre = require('hardhat');
const {
    getAddrFromRegistry,
    impersonateAccount,
    stopImpersonatingAccount,
    getGasUsed,
    getNameId,
    OWNER_ACC,
} = require('./utils');

const getLatestTemplateId = async () => {
    const subscriptionAddr = await getAddrFromRegistry('Subscriptions');

    const subscriptionInstance = await hre.ethers.getContractFactory('Subscriptions');
    const subscription = await subscriptionInstance.attach(subscriptionAddr);

    const latestTemplateId = await subscription.getTemplateCount();

    return latestTemplateId;
};

const getLatestStrategyId = async () => {
    const subscriptionAddr = await getAddrFromRegistry('Subscriptions');

    const subscriptionInstance = await hre.ethers.getContractFactory('Subscriptions');
    const subscription = await subscriptionInstance.attach(subscriptionAddr);

    const latestStrategyId = await subscription.getStrategyCount();

    return latestStrategyId;
};

const subTemplate = async (regAddr, proxy, templateName, triggerNames, actionNames, paramMapping) => {
    const subProxyAddr = await getAddrFromRegistry('SubscriptionProxy', regAddr);

    console.log('cool');

    const triggerIds = triggerNames.map((trigName) => getNameId(trigName));

    const actionIds = actionNames.map((actionName) => getNameId(actionName));

    const SubscriptionProxy = await hre.ethers.getContractFactory('SubscriptionProxy');
    const functionData = SubscriptionProxy.interface.encodeFunctionData(
        'createTemplate',
        [templateName, triggerIds, actionIds, paramMapping],
    );

    console.log('Before');

    const receipt = await proxy['execute(address,bytes)'](subProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed subTemplate; ${gasUsed}`);
};

const subStrategy = async (proxy, templateId, active, subData, triggerData) => {
    const subProxyAddr = await getAddrFromRegistry('SubscriptionProxy');

    const SubscriptionProxy = await hre.ethers.getContractFactory('SubscriptionProxy');
    const functionData = SubscriptionProxy.interface.encodeFunctionData(
        'createStrategy',
        [templateId, active, subData, triggerData],
    );

    const receipt = await proxy['execute(address,bytes)'](subProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed createStrategy; ${gasUsed}`);

    const latestStrategyId = await getLatestStrategyId();

    return latestStrategyId;
};

const addBotCaller = async (regAddr, botAddr) => {
    await impersonateAccount(OWNER_ACC);

    const signer = await hre.ethers.provider.getSigner(OWNER_ACC);
    const botAuthAddr = await getAddrFromRegistry('BotAuth', regAddr);

    const botAuthInstance = await hre.ethers.getContractFactory('BotAuth', signer);
    let botAuth = await botAuthInstance.attach(botAuthAddr);

    botAuth = botAuth.connect(signer);

    await botAuth.addCaller(botAddr);

    await stopImpersonatingAccount(OWNER_ACC);
};

module.exports = {
    subTemplate,
    subStrategy,
    getLatestTemplateId,
    getLatestStrategyId,
    addBotCaller,
};
