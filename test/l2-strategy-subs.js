/* eslint-disable max-len */
const hre = require('hardhat');
const automationSdk = require('@defisaver/automation-sdk');
const {
    subToAaveV3Proxy,
    updateAaveProxy,
    subToStrategy,
    subToCompV3ProxyL2,
} = require('./utils-strategies');

const {
    addrs,
    network,
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
    const subInput = automationSdk.strategySubService.aaveV3Encode.leverageManagement(
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    const subId = await subToAaveV3Proxy(proxy, subInput, regAddr);

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
    _collAsset,
    _collAssetId,
    _debtAsset,
    _debtAssetId,
) => {
    const triggerData = {
        baseTokenAddress: triggerBaseAsset,
        quoteTokenAddress: triggerQuoteAsset,
        price: targetPrice,
        ratioState: (priceState === 1) ? automationSdk.enums.RatioState.UNDER : automationSdk.enums.RatioState.OVER,
    };
    const subData = {
        collAsset: _collAsset,
        collAssetId: _collAssetId,
        debtAsset: _debtAsset,
        debtAssetId: _debtAssetId,
    };
    const strategySub = automationSdk.strategySubService.aaveV3Encode.closeToAsset(
        bundleId,
        true,
        triggerData,
        subData,
    );

    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
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
    const subInput = automationSdk.strategySubService.compoundV3L2Encode.leverageManagement(
        market,
        baseToken,
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    const subId = await subToCompV3ProxyL2(proxy, [subInput], regAddr);

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
