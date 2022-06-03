const hre = require('hardhat');

const {
    subToStrategy,
} = require('./utils-strategies');

const {
    addrs,
    network,
} = require('./utils');

const {
    createAaveV3RatioTrigger,
    RATIO_STATE_UNDER,
} = require('./l2-triggers');

const abiCoder = new hre.ethers.utils.AbiCoder();

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

module.exports = {
    subAaveV3RepayL2Strategy,
};
