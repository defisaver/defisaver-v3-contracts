const hre = require('hardhat');

const RATIO_STATE_OVER = 0;
const RATIO_STATE_UNDER = 1;

const IN_BOOST = 0;
const IN_REPAY = 1;

const BUY_ORDER = 0;
const SELL_ORDER = 1;

const abiCoder = new hre.ethers.utils.AbiCoder();

const createMcdTrigger = async (vaultId, ratio, ratioState) => {
    const param = abiCoder.encode(['uint256', 'uint256', 'uint8'], [vaultId, ratio, ratioState]);

    return param;
};

const createReflexerTrigger = async (safeId, ratio, ratioState) => {
    const param = abiCoder.encode(['uint256', 'uint256', 'uint8'], [safeId, ratio, ratioState]);

    return param;
};

const createLiquityTrigger = async (user, ratio, ratioState) => {
    const param = abiCoder.encode(['address', 'uint256', 'uint8'], [user, ratio, ratioState]);

    return param;
};

const createCurveUsdCollRatioTrigger = async (user, controllerAddr, ratio, ratioState) => {
    const param = abiCoder.encode(['address', 'address', 'uint256', 'uint8'], [user, controllerAddr, ratio, ratioState]);

    return param;
};

const createMorphoBlueRatioTrigger = async (marketId, user, ratio, state) => {
    const param = abiCoder.encode(['bytes32', 'address', 'uint256', 'uint8'], [marketId, user, ratio, state]);
    return param;
};

const createChainLinkPriceTrigger = async (tokenAddr, price, state) => {
    const param = abiCoder.encode(['address', 'uint256', 'uint8'], [tokenAddr, price, state]);
    return param;
};

const createUniV3RangeOrderTrigger = async (tokenId, state) => {
    const param = abiCoder.encode(['uint256', 'uint8'], [tokenId, state]);

    return param;
};
const createTimestampTrigger = async (timestamp, interval) => {
    const param = abiCoder.encode(['uint256', 'uint256'], [timestamp, interval]);

    return param;
};

const createGasPriceTrigger = async (maxGasPrice) => {
    const param = abiCoder.encode(['uint256'], [maxGasPrice]);

    return param;
};

const createCurveUsdHealthRatioTrigger = async (user, controllerAddr, ratio) => {
    const param = abiCoder.encode(['address', 'address', 'uint256'], [user, controllerAddr, ratio]);

    return param;
};

module.exports = {
    createUniV3RangeOrderTrigger,
    createMcdTrigger,
    createChainLinkPriceTrigger,
    createTimestampTrigger,
    createGasPriceTrigger,
    createReflexerTrigger,
    createLiquityTrigger,
    createCurveUsdCollRatioTrigger,
    createMorphoBlueRatioTrigger,
    createCurveUsdHealthRatioTrigger,
    RATIO_STATE_OVER,
    RATIO_STATE_UNDER,
    IN_BOOST,
    IN_REPAY,
    BUY_ORDER,
    SELL_ORDER,
};
