const hre = require('hardhat');
const { getAddrFromRegistry } = require('./utils');

const getHints = async (troveOwner, actionHash, collAmount, LUSDamount) => {
    const liquityView = await hre.ethers.getContractAt('LiquityView', getAddrFromRegistry('LiquityView'));

    const NICR = await liquityView['predictNICR(address,bytes32,uint256,uint256)'](troveOwner, actionHash, LUSDamount, collAmount);

    const approxHint = (await liquityView['getApproxHint(uint256,uint256,uint256)'](NICR, 20, 42)).hintAddress;

    const { upperHint, lowerHint } = await liquityView['findInsertPosition(uint256,address,address)'](NICR, approxHint, approxHint);

    return { upperHint, lowerHint };
};

module.exports = {
    getHints,
};
