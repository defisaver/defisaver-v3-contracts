const hre = require('hardhat');

const RATIO_STATE_OVER = 0;
const RATIO_STATE_UNDER = 1;

const createAaveV3RatioTrigger = async (proxy, market, ratio, ratioState) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();

    const param = abiCoder.encode(['address', 'address', 'uint256', 'uint8'], [proxy, market, ratio, ratioState]);

    return param;
};

module.exports = {
    createAaveV3RatioTrigger,
    RATIO_STATE_OVER,
    RATIO_STATE_UNDER,
};
