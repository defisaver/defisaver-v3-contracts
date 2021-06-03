const hre = require('hardhat');
const {
    getAddrFromRegistry,
    impersonateAccount,
    stopImpersonatingAccount,
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

const subTemplate = async (proxy, templateName, triggerNames, actionNames, paramMapping) => {
    const subProxyAddr = await getAddrFromRegistry('SubscriptionProxy');

    // eslint-disable-next-line max-len
    const triggerIds = triggerNames.map((trigName) => hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(trigName)));

    // eslint-disable-next-line max-len
    const actionIds = actionNames.map((actionName) => hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(actionName)));

    const SubscriptionProxy = await hre.ethers.getContractFactory('SubscriptionProxy');
    const functionData = SubscriptionProxy.interface.encodeFunctionData(
        'createTemplate',
        [templateName, triggerIds, actionIds, paramMapping],
    );

    await proxy['execute(address,bytes)'](subProxyAddr, functionData, {
        gasLimit: 5000000,
    });
};

const subStrategy = async (proxy, templateId, active, actionData, triggerData) => {
    const subProxyAddr = await getAddrFromRegistry('SubscriptionProxy');

    const SubscriptionProxy = await hre.ethers.getContractFactory('SubscriptionProxy');
    const functionData = SubscriptionProxy.interface.encodeFunctionData(
        'createStrategy',
        [templateId, active, actionData, triggerData],
    );

    await proxy['execute(address,bytes)'](subProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const latestStrategyId = await getLatestStrategyId();

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
    subTemplate,
    subStrategy,
    getLatestTemplateId,
    getLatestStrategyId,
    addBotCaller,
};
