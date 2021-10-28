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

const findInsertPosition = async (collAmount, debtAmount, numOfTrials = 400, randomSeed = 42) => {
    const liquityView = await hre.ethers.getContractAt('LiquityView', getAddrFromRegistry('LiquityView'));

    const { upperHint, lowerHint } = await liquityView['getInsertPosition(uint256,uint256,uint256,uint256)'](collAmount, debtAmount, numOfTrials, randomSeed);

    return { upperHint, lowerHint };
};

const getTroveInfo = async (troveOwner) => {
    const liquityView = await hre.ethers.getContractAt('LiquityView', getAddrFromRegistry('LiquityView'));

    return liquityView['getTroveInfo(address)'](troveOwner);
};

const getRatio = async (liquityView, troveOwner) => {
    const {
        troveStatus,
        collAmount,
        debtAmount,
        collPrice,
    } = await liquityView.getTroveInfo(troveOwner);

    const ratio = collAmount.mul(collPrice).div(debtAmount);
    return { ratio, troveStatus };
};

module.exports = {
    getHints,
    LiquityActionIds,
    getTroveInfo,
    findInsertPosition,
    getRatio,
};
