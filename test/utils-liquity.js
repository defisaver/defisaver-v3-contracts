const hre = require('hardhat');
const { getAddrFromRegistry } = require('./utils');

const LiquityActionIds = {
    Open: 0,
    Borrow: 1,
    Payback: 2,
    Supply: 3,
    Withdraw: 4,
};

const getHints = async (troveOwner, actionId, from, collAmount, LUSDamount) => {
    const liquityView = await hre.ethers.getContractAt('LiquityView', getAddrFromRegistry('LiquityView'));

    const NICR = await liquityView['predictNICR(address,uint8,address,uint256,uint256)'](troveOwner, actionId, from, collAmount, LUSDamount);

    const approxHint = (await liquityView['getApproxHint(uint256,uint256,uint256)'](NICR, 20, 42)).hintAddress;

    const { upperHint, lowerHint } = await liquityView['findInsertPosition(uint256,address,address)'](NICR, approxHint, approxHint);

    return { upperHint, lowerHint };
};

module.exports = {
    getHints,
    LiquityActionIds,
};
