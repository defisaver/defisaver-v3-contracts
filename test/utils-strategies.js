const hre = require('hardhat');
const {
    getAddrFromRegistry,
    impersonateAccount,
    stopImpersonatingAccount,
    getGasUsed,
    calcGasToUSD,
    AVG_GAS_PRICE,
    addrs,
    network,
    getNetwork,
    getContractFromRegistry,
} = require('./utils');

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

const getLatestSubId = async (regAddr = addrs[network].REGISTRY_ADDR) => {
    const subStorageAddr = await getAddrFromRegistry('SubStorage', regAddr);

    const subStorageInstance = await hre.ethers.getContractFactory('SubStorage');
    const subStorage = await subStorageInstance.attach(subStorageAddr);

    let latestSubId = await subStorage.getSubsCount();
    latestSubId = (latestSubId - 1).toString();

    return latestSubId;
};

// eslint-disable-next-line max-len
const createStrategy = async (proxy, strategyName, triggerIds, actionIds, paramMapping, continuous) => {
    const storageAddr = await getAddrFromRegistry('StrategyStorage');
    const storage = await hre.ethers.getContractAt('StrategyStorage', storageAddr);

    const receipt = await storage.createStrategy(
        strategyName, triggerIds, actionIds, paramMapping, continuous,
        {
            gasLimit: 5000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed createStrategy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const strategyId = await getLatestStrategyId();

    console.log('strategyId: ', strategyId);

    return strategyId;
};

const createBundle = async (proxy, strategyIds) => {
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

const subToStrategy = async (proxy, strategySub, regAddr = addrs[getNetwork()].REGISTRY_ADDR) => {
    const SubProxyAddr = addrs[getNetwork()].SubProxy;

    const SubProxyProxy = await hre.ethers.getContractFactory('SubProxy');
    const functionData = SubProxyProxy.interface.encodeFunctionData(
        'subscribeToStrategy',
        [strategySub],
    );

    const receipt = await proxy['execute(address,bytes)'](SubProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed subToStrategy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const latestSubId = await getLatestSubId(regAddr);

    return latestSubId;
};

const activateSub = async (proxy, subId, regAddr = addrs[network].REGISTRY_ADDR) => {
    const SubProxyAddr = await getAddrFromRegistry('SubProxy', regAddr);

    const SubProxyProxy = await hre.ethers.getContractFactory('SubProxy');
    const functionData = SubProxyProxy.interface.encodeFunctionData(
        'activateSub',
        [subId.toString()],
    );

    const receipt = await proxy['execute(address,bytes)'](SubProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed activateSub; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    return subId;
};

const subToAaveProxy = async (proxy, inputData, regAddr = addrs[network].REGISTRY_ADDR) => {
    const aaveSubProxyAddr = addrs[network].AAVE_SUB_PROXY;

    const AaveSubProxy = await hre.ethers.getContractFactory('AaveSubProxy');
    const functionData = AaveSubProxy.interface.encodeFunctionData(
        'subToAaveAutomation',
        [inputData],
    );

    const receipt = await proxy['execute(address,bytes)'](aaveSubProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed subToAaveProxy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const latestSubId = await getLatestSubId(regAddr);

    return latestSubId;
};

const subToCompV3Proxy = async (proxy, inputData, regAddr = addrs[network].REGISTRY_ADDR) => {
    const compV3SubProxyAddr = await getAddrFromRegistry('CompV3SubProxy', regAddr);

    const CompV3SubProxy = await hre.ethers.getContractFactory('CompV3SubProxy');
    const functionData = CompV3SubProxy.interface.encodeFunctionData(
        'subToCompV3Automation',
        inputData,
    );

    const receipt = await proxy['execute(address,bytes)'](compV3SubProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed subToCompV3Proxy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const latestSubId = await getLatestSubId(regAddr);

    return latestSubId;
};

const subToCBRebondProxy = async (proxy, inputData, regAddr = addrs[network].REGISTRY_ADDR) => {
    const cbRebondSubProxyAddr = await getAddrFromRegistry('CBRebondSubProxy', regAddr);

    const CBRebondSubProxy = await hre.ethers.getContractFactory('CBRebondSubProxy');
    const functionData = CBRebondSubProxy.interface.encodeFunctionData(
        'subToRebondStrategy',
        inputData,
    );

    const receipt = await proxy['execute(address,bytes)'](cbRebondSubProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed subToRebondStrategy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const latestSubId = await getLatestSubId(regAddr);

    return latestSubId;
};

const subToMorphoAaveV2Proxy = async (proxy, inputData, regAddr = addrs[network].REGISTRY_ADDR) => {
    const subProxyAddr = await getAddrFromRegistry('MorphoAaveV2SubProxy', regAddr);

    const subProxyFactory = await hre.ethers.getContractFactory('MorphoAaveV2SubProxy');
    const functionData = subProxyFactory.interface.encodeFunctionData(
        'subToMorphoAaveV2Automation',
        inputData,
    );

    const receipt = await proxy['execute(address,bytes)'](subProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed subToMorphoAaveV2Proxy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const latestSubId = await getLatestSubId(regAddr);
    const subProxy = await getContractFromRegistry('MorphoAaveV2SubProxy');
    const repaySub = await subProxy.formatRepaySub(...inputData, proxy.address);
    const boostSub = await subProxy.formatBoostSub(...inputData, proxy.address);
    return { latestSubId, repaySub, boostSub };
};

const updateSubDataMorphoAaveV2Proxy = async (
    proxy, subIdRepay, subIdBoost,
    minRatio, maxRatio, optimalRatioBoost, optimalRatioRepay, boostEnabled,
    regAddr = addrs[network].REGISTRY_ADDR,
) => {
    const subInput = [minRatio, maxRatio, optimalRatioBoost, optimalRatioRepay, boostEnabled];

    const subProxyAddr = await getAddrFromRegistry('MorphoAaveV2SubProxy', regAddr);

    const subProxyFactory = await hre.ethers.getContractFactory('MorphoAaveV2SubProxy');

    const functionData = subProxyFactory.interface.encodeFunctionData(
        'updateSubData',
        [
            subIdRepay, subIdBoost, subInput,
        ],
    );

    const receipt = await proxy['execute(address,bytes)'](subProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed updateMorphoAaveV2Proxy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const latestSubId = await getLatestSubId(regAddr);
    const subProxy = await getContractFromRegistry('MorphoAaveV2SubProxy');
    const repaySub = await subProxy.formatRepaySub(subInput, proxy.address);
    const boostSub = await subProxy.formatBoostSub(subInput, proxy.address);
    return { latestSubId, repaySub, boostSub };
};

const subToLiquityProxy = async (proxy, inputData, regAddr = addrs[network].REGISTRY_ADDR) => {
    const subProxyAddr = '0xE2f4A4629FbbC444964A16438329288C66551c30'; // hardcoded here for now
    console.log({ subProxyAddr });

    const subProxyFactory = await hre.ethers.getContractFactory('LiquitySubProxy');
    const functionData = subProxyFactory.interface.encodeFunctionData(
        'subToLiquityAutomation',
        inputData,
    );

    const receipt = await proxy['execute(address,bytes)'](subProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed subToLiquityProxy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const latestSubId = await getLatestSubId(regAddr);
    const subProxy = await hre.ethers.getContractAt('LiquitySubProxy', subProxyAddr);
    const repaySub = await subProxy.formatRepaySub(...inputData, proxy.address);
    const boostSub = await subProxy.formatBoostSub(...inputData, proxy.address);
    return { latestSubId, repaySub, boostSub };
};

const updateLiquityProxy = async (
    proxy, subIdRepay, subIdBoost,
    minRatio, maxRatio, optimalRatioBoost, optimalRatioRepay, boostEnabled,
    regAddr = addrs[network].REGISTRY_ADDR,
) => {
    const subInput = [minRatio, maxRatio, optimalRatioBoost, optimalRatioRepay, boostEnabled];

    const subProxyAddr = await getAddrFromRegistry('LiquitySubProxy', regAddr);

    const subProxyFactory = await hre.ethers.getContractFactory('LiquitySubProxy');

    const functionData = subProxyFactory.interface.encodeFunctionData(
        'updateSubData',
        [
            subIdRepay, subIdBoost, subInput,
        ],
    );

    const receipt = await proxy['execute(address,bytes)'](subProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed updateLiquityProxy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const latestSubId = await getLatestSubId(regAddr);
    const subProxy = await getContractFromRegistry('LiquitySubProxy');
    const repaySub = await subProxy.formatRepaySub(subInput, proxy.address);
    const boostSub = await subProxy.formatBoostSub(subInput, proxy.address);
    return { latestSubId, repaySub, boostSub };
};

const updateAaveProxy = async (proxy, inputData, regAddr = addrs[network].REGISTRY_ADDR) => {
    const aaveSubProxyAddr = addrs[network].AAVE_SUB_PROXY;

    const AaveSubProxy = await hre.ethers.getContractFactory('AaveSubProxy');
    const functionData = AaveSubProxy.interface.encodeFunctionData(
        'updateSubData',
        [inputData],
    );

    const receipt = await proxy['execute(address,bytes)'](aaveSubProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed updateSubDataAaveProxy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    const latestSubId = await getLatestSubId(regAddr);

    return latestSubId;
};

const subToMcdProxy = async (proxy, inputData, regAddr = addrs[network].REGISTRY_ADDR) => {
    const subProxyAddr = await getAddrFromRegistry('McdSubProxy', regAddr);
    const subProxy = await hre.ethers.getContractAt('McdSubProxy', subProxyAddr);

    const functionData = subProxy.interface.encodeFunctionData(
        'subToMcdAutomation',
        [inputData, false],
    );

    const receipt = await proxy['execute(address,bytes)'](subProxyAddr, functionData, {
        gasLimit: 5000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(`GasUsed subToMcdProxy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);

    let repaySubId;
    let boostSubId;
    if (inputData.slice(-1)[0]) {
        boostSubId = +await getLatestSubId(regAddr);
        repaySubId = boostSubId - 1;
    } else {
        repaySubId = +await getLatestSubId(regAddr);
    }

    const repaySub = await subProxy.formatRepaySub(inputData);
    const boostSub = await subProxy.formatBoostSub(inputData);
    return {
        repaySubId, boostSubId, repaySub, boostSub,
    };
};

const addBotCaller = async (
    botAddr,
    regAddr = addrs[getNetwork()].REGISTRY_ADDR,
    isFork = false,
    networkInjected = getNetwork(),
) => {
    if (regAddr === addrs[getNetwork()].REGISTRY_ADDR && !isFork) {
        await impersonateAccount(addrs[getNetwork()].OWNER_ACC);
    }

    const signer = await hre.ethers.provider.getSigner(addrs[networkInjected].OWNER_ACC);
    const botAuthAddr = await getAddrFromRegistry('BotAuth', regAddr);

    const botAuthInstance = await hre.ethers.getContractFactory('BotAuth', signer);
    let botAuth = await botAuthInstance.attach(botAuthAddr);

    botAuth = botAuth.connect(signer);

    await botAuth.addCaller(botAddr, { gasLimit: 800000 });

    if (regAddr === addrs[getNetwork()].REGISTRY_ADDR && !isFork) {
        await stopImpersonatingAccount(addrs[getNetwork()].OWNER_ACC);
    }
};

const setMCDPriceVerifier = async (triggerAddr) => {
    const oldOwner = '0x0528A32fda5beDf89Ba9ad67296db83c9452F28C';
    await impersonateAccount(oldOwner);

    const signer = await hre.ethers.provider.getSigner(oldOwner);

    let mcdPriceVerifier = await hre.ethers.getContractAt('IMCDPriceVerifier', '0xeAa474cbFFA87Ae0F1a6f68a3aBA6C77C656F72c');

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

module.exports = {
    subToStrategy,
    activateSub,
    subToAaveProxy,
    subToCompV3Proxy,
    updateAaveProxy,
    createStrategy,
    createBundle,
    getLatestStrategyId,
    getLatestBundleId,
    getLatestSubId,
    addBotCaller,
    setMCDPriceVerifier,
    getSubHash,
    subToCBRebondProxy,
    subToMorphoAaveV2Proxy,
    updateSubDataMorphoAaveV2Proxy,
    subToLiquityProxy,
    updateLiquityProxy,
    subToMcdProxy,
};
