const hre = require('hardhat');

const RATIO_STATE_OVER = 0;
const RATIO_STATE_UNDER = 1;

const createMcdTrigger = async (vaultId, ratio, ratioState) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();

    const param = abiCoder.encode(['uint256', 'uint256', 'uint8'], [vaultId, ratio, ratioState]);

    return param;
};

module.exports = {
    createMcdTrigger,
    RATIO_STATE_OVER,
    RATIO_STATE_UNDER,
};
