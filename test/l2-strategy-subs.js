const hre = require('hardhat');

const {
    subToStrategy,
    subToAaveProxy,
} = require('./utils-strategies');

const {
    addrs,
    network,
} = require('./utils');

const {
    createAaveV3RatioTrigger,
    RATIO_STATE_UNDER,
    RATIO_STATE_OVER,
} = require('./l2-triggers');

const abiCoder = new hre.ethers.utils.AbiCoder();

const subAaveV3L2AutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    regAddr = addrs[network].REGISTRY_ADDR,
) => {
    let subInput = '0x';

    subInput = subInput.concat(minRatio.padStart(32, '0'));
    subInput = subInput.concat(maxRatio.padStart(32, '0'));
    subInput = subInput.concat(optimalRatioBoost.padStart(32, '0'));
    subInput = subInput.concat(optimalRatioRepay.padStart(32, '0'));
    subInput = subInput.concat(boostEnabled ? '01' : '00');

    console.log(subInput);

    const subId = await subToAaveProxy(proxy, subInput, regAddr);

    return subId;
};

const subAaveV3RepayL2Strategy = async (
    proxy,
    strategyId,
    market,
    rationUnder,
    targetRatio,
    isBundle,
    regAddr = addrs[network].REGISTRY_ADDR,
) => {
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const useDefaultMarketEncoded = abiCoder.encode(['bool'], [true]);
    const onBehalfOfEncoded = abiCoder.encode(['bool'], [false]);

    const triggerData = await createAaveV3RatioTrigger(
        proxy.address,
        market,
        rationUnder,
        RATIO_STATE_UNDER,
    );

    const strategySub = [
        strategyId,
        isBundle,
        [triggerData],
        [targetRatioEncoded, useDefaultMarketEncoded, onBehalfOfEncoded],
    ];

    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subAaveV3BoostL2Strategy = async (
    proxy,
    strategyId,
    market,
    rationOver,
    targetRatio,
    isBundle,
    regAddr = addrs[network].REGISTRY_ADDR,
) => {
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const useDefaultMarketEncoded = abiCoder.encode(['bool'], [true]);
    const onBehalfOfEncoded = abiCoder.encode(['bool'], [false]);
    const enableAsCollEncoded = abiCoder.encode(['bool'], [true]);

    const triggerData = await createAaveV3RatioTrigger(
        proxy.address,
        market,
        rationOver,
        RATIO_STATE_OVER,
    );

    const strategySub = [
        strategyId,
        isBundle,
        [triggerData],
        [targetRatioEncoded, useDefaultMarketEncoded, onBehalfOfEncoded, enableAsCollEncoded],
    ];

    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

module.exports = {
    subAaveV3RepayL2Strategy,
    subAaveV3BoostL2Strategy,
    subAaveV3L2AutomationStrategy,
};
