const hre = require('hardhat');
const {
    getNetwork,
    addrs,
    impersonateAccount,
    getAddrFromRegistry,
    stopImpersonatingAccount,
    getOwnerAddr,
} = require('./utils');

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

const addInitialFeeTokens = async (isFork = false) => {
    if (!isFork) {
        await impersonateAccount(getOwnerAddr());
    }

    const signer = await hre.ethers.provider.getSigner(getOwnerAddr());
    const registryAddr = await getAddrFromRegistry('SupportedFeeTokensRegistry');
    const registryInstance = await hre.ethers.getContractAt('SupportedFeeTokensRegistry', registryAddr, signer);

    await registryInstance.add(addrs[getNetwork()].DAI_ADDRESS);
    await registryInstance.add(addrs[getNetwork()].USDC_ADDR);
    await registryInstance.add(addrs[getNetwork()].WETH_ADDRESS);

    if (!isFork) {
        await stopImpersonatingAccount(getOwnerAddr());
    }
};

// include gas used for calculating and sending fee, hardcode it like this for now
// adjust values based on fee token and if we are pulling tokens from EOA or smart wallet
// this values will be singed from UI as they are packed into safe signature
const determineAdditionalGasUsedInTxRelay = (feeToken, pullingFromEoa) => {
    if (pullingFromEoa) {
        if (feeToken === addrs[getNetwork()].USDC_ADDR) {
            return 64300;
        }
        if (feeToken === addrs[getNetwork()].DAI_ADDRESS) {
            return 53623;
        }
        if (feeToken === addrs[getNetwork()].WETH_ADDRESS) {
            return 10000;
        }
    } else {
        if (feeToken === addrs[getNetwork()].USDC_ADDR) {
            return 63000;
        }
        if (feeToken === addrs[getNetwork()].DAI_ADDRESS) {
            return 53000;
        }
        if (feeToken === addrs[getNetwork()].WETH_ADDRESS) {
            return 9300;
        }
    }
    return 0;
};

module.exports = {
    addBotCallerForTxRelay,
    addInitialFeeTokens,
    determineAdditionalGasUsedInTxRelay,
};
