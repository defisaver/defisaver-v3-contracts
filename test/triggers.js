const hre = require('hardhat');

const RATIO_STATE_OVER = 0;
const RATIO_STATE_UNDER = 1;

const BUY_ORDER = 0;
const SELL_ORDER = 1;

const abiCoder = new hre.ethers.utils.AbiCoder();

const createMcdTrigger = async (vaultId, ratio, ratioState) => {
    const param = abiCoder.encode(['uint256', 'uint256', 'uint8'], [vaultId, ratio, ratioState]);

    return param;
};

const createCompTrigger = async (user, ratio, ratioState) => {
    const param = abiCoder.encode(['address', 'uint256', 'uint8'], [user, ratio, ratioState]);

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

const createChainLinkPriceTrigger = async (tokenAddr, price, state) => {
    const param = abiCoder.encode(['address', 'uint256', 'uint8'], [tokenAddr, price, state]);
    return param;
};

const createOffchainPriceTrigger = async (targetPrice, goodUntil, orderType) => {
    const param = abiCoder.encode(['uint256', 'uint256', 'uint8'], [targetPrice, goodUntil, orderType]);
    return param;
};

const createTrailingStopTrigger = async (chainlinkTokenAddr, percentage, roundId) => {
    const param = abiCoder.encode(['address', 'uint256', 'uint80'], [chainlinkTokenAddr, percentage, roundId]);
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

const createCbRebondTrigger = async (bondID) => {
    const param = abiCoder.encode(['uint256'], [bondID]);

    return param;
};

module.exports = {
    createUniV3RangeOrderTrigger,
    createMcdTrigger,
    createChainLinkPriceTrigger,
    createTimestampTrigger,
    createGasPriceTrigger,
    createCompTrigger,
    createReflexerTrigger,
    createLiquityTrigger,
    createTrailingStopTrigger,
    createCbRebondTrigger,
    createOffchainPriceTrigger,
    RATIO_STATE_OVER,
    RATIO_STATE_UNDER,
    BUY_ORDER,
    SELL_ORDER,
};
