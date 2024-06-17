const hre = require('hardhat');
const {
    impersonateAccount,
    getAddrFromRegistry,
    stopImpersonatingAccount,
    getOwnerAddr,
    nullAddress,
} = require('../utils');

const addBotCallerForTxSaver = async (
    botAddr,
    isFork = false,
) => {
    if (!isFork) {
        await impersonateAccount(getOwnerAddr());
    }

    const signer = await hre.ethers.provider.getSigner(getOwnerAddr());
    const botAuthAddr = await getAddrFromRegistry('BotAuthForTxSaver');

    const botAuthInstance = await hre.ethers.getContractFactory('BotAuthForTxSaver', signer);
    let botAuth = await botAuthInstance.attach(botAuthAddr);

    botAuth = botAuth.connect(signer);

    await botAuth.addCaller(botAddr, { gasLimit: 800000 });

    if (!isFork) {
        await stopImpersonatingAccount(getOwnerAddr());
    }
};

const emptyInjectedOffchainOrder = {
    wrapper: nullAddress,
    wrapperData: hre.ethers.utils.arrayify('0x'), // Empty bytes
    offchainData: {
        wrapper: nullAddress,
        exchangeAddr: nullAddress,
        allowanceTarget: nullAddress,
        price: 0,
        protocolFee: 0,
        callData: hre.ethers.utils.arrayify('0x'), // Empty bytes
    },
};

module.exports = {
    addBotCallerForTxSaver,
    emptyInjectedOffchainOrder,
};
