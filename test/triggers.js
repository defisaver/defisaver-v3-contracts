const hre = require('hardhat');

const RATIO_STATE_OVER = 0;
const RATIO_STATE_UNDER = 1;

const createMcdTrigger = async (vaultId, ratio, ratioState) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();

    const param = abiCoder.encode(['uint256', 'uint256', 'uint8'], [vaultId, ratio, ratioState]);

    return param;
};

const createChainLinkPriceTrigger = async (tokenAddr, price, state) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();

    const param = abiCoder.encode(['address', 'uint256', 'uint8'], [tokenAddr, price, state]);
    return param;
};
const createUniV3RangeOrderTrigger = async (tokenId, state) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();

    const param = abiCoder.encode(['uint256', 'uint8'], [tokenId, state]);

    return param;
};
const createTimestampTrigger = async (timestamp) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();
    const param = abiCoder.encode(['uint256'], [timestamp]);

    return param;
};

const createGasPriceTrigger = async (maxGasPrice) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();
    const param = abiCoder.encode(['uint256'], [maxGasPrice]);

    return param;
};

module.exports = {
    createUniV3RangeOrderTrigger,
    createMcdTrigger,
    createChainLinkPriceTrigger,
    createTimestampTrigger,
    createGasPriceTrigger,
    RATIO_STATE_OVER,
    RATIO_STATE_UNDER,
};
