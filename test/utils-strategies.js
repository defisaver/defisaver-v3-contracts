const hre = require('hardhat');
const {
    getAddrFromRegistry,
    impersonateAccount,
    stopImpersonatingAccount,
    getGasUsed,
    OWNER_ACC,
} = require('./utils');

const getLatestTemplateId = async () => {
    const subscriptionAddr = await getAddrFromRegistry('Subscriptions');

    const subscriptionInstance = await hre.ethers.getContractFactory('Subscriptions');
    const subscription = await subscriptionInstance.attach(subscriptionAddr);

    let latestTemplateId = await subscription.getTemplateCount();
    latestTemplateId = (latestTemplateId - 1).toString();

    return latestTemplateId;
};

const getLatestStrategyId = async () => {
    const subscriptionAddr = await getAddrFromRegistry('Subscriptions');

    const subscriptionInstance = await hre.ethers.getContractFactory('Subscriptions');
    const subscription = await subscriptionInstance.attach(subscriptionAddr);

    let latestStrategyId = await subscription.getStrategyCount();
    latestStrategyId = (latestStrategyId - 1).toString();

    return latestStrategyId;
};

// eslint-disable-next-line max-len
const subTemplate = async (proxy, templateName, triggerIds, actionIds, paramMapping) => {
    const subProxyAddr = await getAddrFromRegistry('SubscriptionProxy');

    const SubscriptionProxy = await hre.ethers.getContractFactory('SubscriptionProxy');

    const functionData = SubscriptionProxy.interface.encodeFunctionData(
        'createTemplate',
        [templateName, triggerIds, actionIds, paramMapping],
    );

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
