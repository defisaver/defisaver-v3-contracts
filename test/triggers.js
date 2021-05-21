const hre = require('hardhat');

const RATIO_STATE_OVER = 0;
const RATIO_STATE_UNDER = 1;

const createMcdTrigger = async (vaultId, ratio, ratioState) => {
    const abiCoder = new hre.ethers.utils.AbiCoder();

    const param1 = abiCoder.encode(['uint256'], [vaultId]);
    const param2 = abiCoder.encode(['uint256'], [ratio]);
    const param3 = abiCoder.encode(['uint8'], [ratioState]);

    return [param1, param2, param3];
};

module.exports = {
    createMcdTrigger,
    RATIO_STATE_OVER,
    RATIO_STATE_UNDER,
};
