const hre = require('hardhat');
const { defaultAbiCoder } = require('ethers/lib/utils');
const {
    subToAaveProxy,
    updateAaveProxy,
    subToStrategy,
    subToCompV3ProxyL2,
} = require('./utils-strategies');

const {
    addrs,
    network,
    nullAddress,
} = require('./utils');

const subAaveV3L2AutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    regAddr = addrs[network].REGISTRY_ADDR,
) => {
    let subInput = '0x';

    subInput = subInput.concat(minRatio.padStart(32, '0'));
    subInput = subInput.concat(maxRatio.padStart(32, '0'));
    subInput = subInput.concat(optimalRatioBoost.padStart(32, '0'));
    subInput = subInput.concat(optimalRatioRepay.padStart(32, '0'));
    subInput = subInput.concat(boostEnabled ? '01' : '00');

    const subId = await subToAaveProxy(proxy, subInput, regAddr);

    let subId1 = '0';
    let subId2 = '0';

    if (boostEnabled) {
        subId1 = (parseInt(subId, 10) - 1).toString();
        subId2 = subId;
    } else {
        subId1 = subId;
        subId2 = '0';
    }

    console.log('Subs: ', subId, subId2);

    return { firstSub: subId1, secondSub: subId2 };
};

const updateAaveV3L2AutomationStrategy = async (
    proxy,
    subId1,
    subId2,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    regAddr = addrs[network].REGISTRY_ADDR,
) => {
    let subInput = '0x';

    const subId1Hex = (+subId1).toString(16);
    const subId2Hex = (+subId2).toString(16);

    subInput = subInput.concat(subId1Hex.padStart(8, '0'));
    subInput = subInput.concat(subId2Hex.padStart(8, '0'));

    subInput = subInput.concat(minRatio.padStart(32, '0'));
    subInput = subInput.concat(maxRatio.padStart(32, '0'));
    subInput = subInput.concat(optimalRatioBoost.padStart(32, '0'));
    subInput = subInput.concat(optimalRatioRepay.padStart(32, '0'));
    subInput = subInput.concat(boostEnabled ? '01' : '00');

    const subId = await updateAaveProxy(proxy, subInput, regAddr);

    if (subId2 === '0' && boostEnabled === true) {
        // eslint-disable-next-line no-param-reassign
        subId2 = subId;
    }

    return { firstSub: subId1, secondSub: subId2 };
};

const subAaveV3CloseBundle = async (
    proxy,
    bundleId,
    triggerBaseAsset,
    triggerQuoteAsset,
    targetPrice,
    priceState,
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
) => {
    const triggerData = defaultAbiCoder.encode(['address', 'address', 'uint256', 'uint8'], [triggerBaseAsset, triggerQuoteAsset, targetPrice, priceState]);

    const strategySub = [bundleId, true, [triggerData], [
        defaultAbiCoder.encode(['address'], [collAsset]),
        defaultAbiCoder.encode(['uint16'], [collAssetId.toString()]),
        defaultAbiCoder.encode(['address'], [debtAsset]),
        defaultAbiCoder.encode(['uint16'], [debtAssetId.toString()]),
        defaultAbiCoder.encode(['address'], [nullAddress]), // needed so we dont have to trust injection
    ]];

    return subToStrategy(proxy, strategySub);
};

const subToCompV3L2AutomationStrategy = async (
    proxy,
    market,
    baseToken,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    regAddr = addrs[network].REGISTRY_ADDR,
) => {
    const minRatioBytes = hre.ethers.utils.zeroPad(hre.ethers.BigNumber.from(minRatio), 16);
    const maxRatioBytes = hre.ethers.utils.zeroPad(hre.ethers.BigNumber.from(maxRatio), 16);
    const optimalRatioBoostBytes = hre.ethers.utils.zeroPad(
        hre.ethers.BigNumber.from(optimalRatioBoost), 16,
    );
    const optimalRatioRepayBytes = hre.ethers.utils.zeroPad(
        hre.ethers.BigNumber.from(optimalRatioRepay), 16,
    );
    const boostEnabledBytes = boostEnabled ? '0x01' : '0x00';

    const subInput = hre.ethers.utils.concat([
        market,
        baseToken,
        minRatioBytes,
        maxRatioBytes,
        optimalRatioBoostBytes,
        optimalRatioRepayBytes,
        boostEnabledBytes,
    ]);

    const subId = await subToCompV3ProxyL2(proxy, subInput, regAddr);

    let subId1 = '0';
    let subId2 = '0';

    if (boostEnabled) {
        subId1 = (parseInt(subId, 10) - 1).toString();
        subId2 = subId;
    } else {
        subId1 = subId;
        subId2 = '0';
    }

    console.log('Subs: ', subId1, subId2);

    return { firstSub: subId1, secondSub: subId2 };
};

module.exports = {
    subAaveV3L2AutomationStrategy,
    updateAaveV3L2AutomationStrategy,
    subAaveV3CloseBundle,
    subToCompV3L2AutomationStrategy,
};
