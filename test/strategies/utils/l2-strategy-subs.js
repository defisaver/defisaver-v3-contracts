const automationSdk = require('@defisaver/automation-sdk');
const { subToStrategy } = require('./utils-strategies');
const { subAaveV3AutomationStrategy } = require('./strategy-subs');

const subAaveV3L2AutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
) => {
    const { repaySubId, boostSubId, repaySub, boostSub } = await subAaveV3AutomationStrategy(
        proxy,
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    console.log('Subs: ', repaySubId, boostSubId);

    return {
        firstSub: repaySubId,
        secondSub: boostSubId,
        repaySub,
        boostSub,
    };
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
        ratioState:
            priceState === 1
                ? automationSdk.enums.RatioState.UNDER
                : automationSdk.enums.RatioState.OVER,
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

module.exports = {
    subAaveV3L2AutomationStrategy,
    subAaveV3CloseBundle,
};
