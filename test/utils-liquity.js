const { getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');
const { getAddrFromRegistry, balanceOf } = require('./utils');

const LiquityActionIds = {
    Open: 0,
    Borrow: 1,
    Payback: 2,
    Supply: 3,
    Withdraw: 4,
};

const prefetchedHints = {
    '0xe9bc620c03ec8ba289ba85d8af9b6a21582ddd71cc8a295b2f7f9dcfab625c46': {
        upperHint: '0x79f08F2e75A8C99428DE4A2e6456c07C99E55da5',
        lowerHint: '0x6F34622c303EC989A113F8b491b60b68CA55015B',
    },
    '0x4e90db7e60313f0c7dbe3ef95dd3b24c67024eedd08da9a18c4d3911a286e7ec': {
        upperHint: '0x5513864EB307be5e3442226a7832e081b2B4684E',
        lowerHint: '0xb6CeDAC7b590bd719fC2913DFe820cdA74840e9c',
    },
    '0x29689ca83e14e5d0cbd3512acdcd28f6ab3716c136b751f80b5a76893b184705': {
        upperHint: '0xD6a5C77892A069a346B2A7163920dE74c86630e1',
        lowerHint: '0x06D44c61D4AC23c7A3c04ab1b87771526A2b1d34',
    },
    '0x380c3a7d63f44320b146e80cf42b67b65b2129d17e82a61473681799fa51f811': {
        upperHint: '0xcE922C3397A37C266476Ad0488eAF6771D9E8a40',
        lowerHint: '0xD79a3323119dfE910C6AC7c506036BE6ebd44417',
    },
    '0x6927fd814fae9cea9652997676de083fc9561c50c31878efa2ee4f683e8d1a00': {
        upperHint: '0xAe86201C431166837f720C3A11c956312Ee98412',
        lowerHint: '0x197A78Fe1bD3BBb64c1325c027bdE8F67Bac1770',
    },
    '0x329d4610acc24ade5f86ea2a260302b85cba6cc396aa0e42fbf3f2fa8b7fe30a': {
        upperHint: '0x5513864EB307be5e3442226a7832e081b2B4684E',
        lowerHint: '0xb6CeDAC7b590bd719fC2913DFe820cdA74840e9c',
    },
    '0x39900c9d9ec3bce59524e2e9fe77e7d528f37a6d60909e9bc40ab75c9d6cf51f': {
        upperHint: '0x4eA3C12835ee04079A967658416D2D6C5FAB18c2',
        lowerHint: '0x3fde28E43c4119409C9884b6CDB8A27C1f0a0BA0',
    },
    '0x2827392b1a49d5b89f2427340b19139b8150b05c911795cdf030f98f819aebd2': {
        firstRedemptionHint: '0x29D0cAb031DD0C4fb1adF98D56a7b0aD2d93Ca5F',
        partialRedemptionHintNICR: { _hex: '0x67d4a7339d08c9', _isBigNumber: true },
        truncatedLUSDamount: { _hex: '0xd8d726b7177a800000', _isBigNumber: true },
        upperHint: '0x0561a78021D8966ddD20c28C6c4318D8675eE1F0',
        lowerHint: '0x29D0cAb031DD0C4fb1adF98D56a7b0aD2d93Ca5F',
    },
    '0x5294d27032bd0dfc634387a6a53a1b3a99e5daab30ff27e577089567f09df04f': {
        firstRedemptionHint: '0x29D0cAb031DD0C4fb1adF98D56a7b0aD2d93Ca5F',
        partialRedemptionHintNICR: { _hex: '0x6811ad777d2735', _isBigNumber: true },
        truncatedLUSDamount: { _hex: '0x014542ba12a337c00000', _isBigNumber: true },
        upperHint: '0x0561a78021D8966ddD20c28C6c4318D8675eE1F0',
        lowerHint: '0x29D0cAb031DD0C4fb1adF98D56a7b0aD2d93Ca5F',
    },
};

const getHints = async (troveOwner, actionId, from, collAmount, LUSDamount) => {
    const blockNum = hre.ethers.provider.blockNumber;
    const paramsSerialized = JSON.stringify(
        {
            blockNum, troveOwner, actionId, from, collAmount, LUSDamount,
        },
    );
    const paramsEncoded = hre.ethers.utils.defaultAbiCoder.encode(
        ['string'],
        [paramsSerialized],
    );
    const paramsHash = hre.ethers.utils.keccak256(paramsEncoded);
    let hints = prefetchedHints[paramsHash];

    if (hints !== undefined) return hints;

    const liquityView = await hre.ethers.getContractAt('LiquityView', getAddrFromRegistry('LiquityView'));
    const NICR = await liquityView['predictNICR(address,uint8,address,uint256,uint256)'](troveOwner, actionId, from, collAmount, LUSDamount);
    const approxHint = (await liquityView['getApproxHint(uint256,uint256,uint256)'](NICR, 20, 42)).hintAddress;
    hints = await liquityView['findInsertPosition(uint256,address,address)'](NICR, approxHint, approxHint);

    return hints;
};

const getRedemptionHints = async (lusdAmount, from) => {
    const blockNum = hre.ethers.provider.blockNumber;
    const paramsSerialized = JSON.stringify(
        { blockNum, lusdAmount, from },
    );
    const paramsEncoded = hre.ethers.utils.defaultAbiCoder.encode(
        ['string'],
        [paramsSerialized],
    );
    const paramsHash = hre.ethers.utils.keccak256(paramsEncoded);
    let hints = prefetchedHints[paramsHash];

    if (hints !== undefined) return hints;

    const liquityView = await hre.ethers.getContractAt('LiquityView', getAddrFromRegistry('LiquityView'));
    const priceFeed = await hre.ethers.getContractAt('IPriceFeed', '0x4c517D4e2C851CA76d7eC94B805269Df0f2201De');
    const collPrice = await priceFeed.callStatic.fetchPrice();

    if (lusdAmount === hre.ethers.constants.MaxUint256) {
        const lusdAddr = getAssetInfo('LUSD').address;
        // eslint-disable-next-line no-param-reassign
        lusdAmount = await balanceOf(lusdAddr, from);
    }
    const {
        firstRedemptionHint,
        partialRedemptionHintNICR,
        truncatedLUSDamount,
    } = await liquityView['getRedemptionHints(uint256,uint256,uint256)'](
        lusdAmount,
        collPrice,
        0,
    );
    const { hintAddress } = await liquityView['getApproxHint(uint256,uint256,uint256)'](
        partialRedemptionHintNICR,
        200,
        42,
    );
    const { upperHint, lowerHint } = await liquityView[
        'findInsertPosition(uint256,address,address)'
    ](partialRedemptionHintNICR, hintAddress, hintAddress);

    hints = {
        firstRedemptionHint,
        partialRedemptionHintNICR,
        truncatedLUSDamount,
        upperHint,
        lowerHint,
    };
    console.log(blockNum, paramsHash, hints);
    return hints;
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
    getRedemptionHints,
    LiquityActionIds,
    getTroveInfo,
    findInsertPosition,
    getRatio,
};
