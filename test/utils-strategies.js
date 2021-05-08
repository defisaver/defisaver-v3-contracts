const hre = require('hardhat');
const {
    getAddrFromRegistry,
} = require('./utils');

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
};

module.exports = {
    subTemplate,
    subStrategy,
};
