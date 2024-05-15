const hre = require('hardhat');
const {
    getNetwork,
    addrs,
    impersonateAccount,
    getAddrFromRegistry,
    stopImpersonatingAccount,
    getOwnerAddr,
    nullAddress,
} = require('../utils');

const addBotCallerForTxRelay = async (
    botAddr,
    isFork = false,
) => {
    if (!isFork) {
        await impersonateAccount(getOwnerAddr());
    }

    const signer = await hre.ethers.provider.getSigner(getOwnerAddr());
    const botAuthAddr = await getAddrFromRegistry('BotAuthForTxRelay');

    const botAuthInstance = await hre.ethers.getContractFactory('BotAuthForTxRelay', signer);
    let botAuth = await botAuthInstance.attach(botAuthAddr);

    botAuth = botAuth.connect(signer);

    await botAuth.addCaller(botAddr, { gasLimit: 800000 });

    if (!isFork) {
        await stopImpersonatingAccount(getOwnerAddr());
    }
};

// TODO[TX-RELAY]: adjust these values based on the actual gas used
const determineAdditionalGasUsedInTxRelay = (feeToken) => {
    const feeTokenLower = feeToken.toLowerCase();
    if (feeTokenLower === addrs[getNetwork()].USDC_ADDR.toLowerCase()) {
        return 64300;
    }
    if (feeTokenLower === addrs[getNetwork()].DAI_ADDRESS.toLowerCase()) {
        return 90000;
    }
    if (feeTokenLower === addrs[getNetwork()].WETH_ADDRESS.toLowerCase()) {
        return 10000;
    }
    return 0;
};

const emptyOffchainOrder = {
    wrapper: nullAddress,
    exchangeAddr: nullAddress,
    allowanceTarget: nullAddress,
    price: 0,
    protocolFee: 0,
    callData: hre.ethers.utils.arrayify('0x'), // Empty bytes
};

module.exports = {
    addBotCallerForTxRelay,
    determineAdditionalGasUsedInTxRelay,
    emptyOffchainOrder,
};
