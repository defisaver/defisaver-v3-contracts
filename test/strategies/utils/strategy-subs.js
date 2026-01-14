/* eslint-disable no-unused-vars */
const hre = require('hardhat');
const automationSdk = require('@defisaver/automation-sdk');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    subToStrategy,
    subToCompV2Proxy,
    subToLimitOrderProxy,
    subToLiquityProxy,
    subToAaveV2Proxy,
    subToSparkProxy,
    updateSparkProxy,
    subToAaveV3Proxy,
    getLatestSubId,
} = require('./utils-strategies');

const {
    RATIO_STATE_UNDER,
    RATIO_STATE_OVER,
    IN_REPAY,
    IN_BOOST,
    createMorphoBlueRatioTrigger,
} = require('./triggers');

const {
    DAI_ADDR,
    WBTC_ADDR,
    WETH_ADDRESS,
    getContractFromRegistry,
    chainIds,
    BOLD_ADDR,
    network,
    executeTxFromProxy,
    getGasUsed,
    calcGasToUSD,
    AVG_GAS_PRICE,
} = require('../../utils/utils');
const { COMP_V3_MARKETS } = require('../../utils/compoundV3');

const abiCoder = new hre.ethers.utils.AbiCoder();

const subDcaStrategy = async (
    proxy,
    tokenAddrSell,
    tokenAddrBuy,
    amount,
    interval,
    lastTimestamp,
) => {
    const strategySub = automationSdk.strategySubService.exchangeEncode.dca(
        tokenAddrSell,
        tokenAddrBuy,
        amount,
        lastTimestamp,
        interval,
        chainIds[network],
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subRepayFromSavingsStrategy = async (proxy, bundleId, vaultId, rationUnder, targetRatio) => {
    const strategySub = automationSdk.strategySubService.makerEncode.repayFromSavings(
        bundleId,
        vaultId,
        rationUnder,
        targetRatio,
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subMcdCloseToDaiStrategy = async (
    vaultId,
    proxy,
    targetPrice,
    chainlinkCollAddress,
    tokenState,
) => {
    const strategySub = automationSdk.strategySubService.makerEncode.closeOnPrice(
        vaultId,
        tokenState === 1
            ? automationSdk.enums.RatioState.UNDER
            : automationSdk.enums.RatioState.OVER,
        targetPrice.toString(),
        DAI_ADDR,
        chainlinkCollAddress,
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subMcdTrailingCloseToDaiStrategy = async (
    vaultId,
    proxy,
    tokenAddress,
    percentage,
    roundId,
) => {
    let chainlinkTokenAddr = tokenAddress;
    if (tokenAddress.toLowerCase() === WBTC_ADDR.toLowerCase()) {
        chainlinkTokenAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
    }
    const strategySub = automationSdk.strategySubService.makerEncode.trailingStop(
        vaultId,
        percentage,
        DAI_ADDR,
        chainlinkTokenAddr,
        roundId,
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subMcdCloseToCollStrategy = async (vaultId, proxy, targetPrice, tokenAddress, ratioState) => {
    let chainlinkTokenAddr = tokenAddress;
    if (tokenAddress.toLowerCase() === WBTC_ADDR.toLowerCase()) {
        chainlinkTokenAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
    }
    const strategySub = automationSdk.strategySubService.makerEncode.closeOnPrice(
        vaultId,
        ratioState === 1
            ? automationSdk.enums.RatioState.UNDER
            : automationSdk.enums.RatioState.OVER,
        targetPrice.toString(),
        tokenAddress,
        chainlinkTokenAddr,
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subMcdTrailingCloseToCollStrategy = async (
    vaultId,
    proxy,
    tokenAddress,
    percentage,
    roundId,
) => {
    let chainlinkTokenAddr = tokenAddress;
    if (tokenAddress.toLowerCase() === WBTC_ADDR.toLowerCase()) {
        chainlinkTokenAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
    }
    const strategySub = automationSdk.strategySubService.makerEncode.trailingStop(
        vaultId,
        percentage,
        tokenAddress,
        chainlinkTokenAddr,
        roundId,
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subLiquityCloseToCollStrategy = async (proxy, targetPrice, tokenState) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.closeOnPrice(
        tokenState === 1
            ? automationSdk.enums.RatioState.UNDER
            : automationSdk.enums.RatioState.OVER,
        targetPrice,
        WETH_ADDRESS,
        WETH_ADDRESS,
        chainIds[network],
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subLiquityTrailingCloseToCollStrategy = async (proxy, percentage, roundId) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.trailingStop(
        percentage,
        WETH_ADDRESS,
        WETH_ADDRESS,
        roundId,
        chainIds[network],
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subLimitOrderStrategy = async (
    proxy,
    tokenAddrSell,
    tokenAddrBuy,
    amount,
    targetPrice,
    goodUntilDuration,
    orderType,
) => {
    const subInput = automationSdk.strategySubService.exchangeEncode.limitOrder(
        tokenAddrSell,
        tokenAddrBuy,
        amount,
        targetPrice,
        goodUntilDuration,
        orderType,
    );

    const { subId, strategySub } = await subToLimitOrderProxy(proxy, [subInput]);

    return { subId, strategySub };
};

const subAaveV2AutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
) => {
    const subInput = automationSdk.strategySubService.aaveV2Encode.leverageManagement(
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );
    const subData = await subToAaveV2Proxy(proxy, [subInput]);

    let subId1 = '0';
    let subId2 = '0';

    if (boostEnabled) {
        subId1 = (parseInt(subData.subId, 10) - 1).toString();
        subId2 = subData.subId;
    } else {
        subId1 = subData.subId;
        subId2 = '0';
    }

    return {
        repaySubId: subId1,
        boostSubId: subId2,
        repaySub: subData.repaySub,
        boostSub: subData.boostSub,
    };
};

const subAaveV3AutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    subProxy,
) => {
    const subInput = automationSdk.strategySubService.aaveV3Encode.leverageManagement(
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    const subData = await subToAaveV3Proxy(proxy, subInput, subProxy);

    let subId1 = '0';
    let subId2 = '0';

    if (boostEnabled) {
        subId1 = (parseInt(subData.latestSubId, 10) - 1).toString();
        subId2 = subData.latestSubId;
    } else {
        subId1 = subData.latestSubId;
        subId2 = '0';
    }

    return {
        repaySubId: subId1,
        boostSubId: subId2,
        repaySub: subData.repaySub,
        boostSub: subData.boostSub,
    };
};

const subAaveV3LeverageManagementGeneric = async (
    bundleId,
    proxy,
    eoaAddr,
    marketAddr,
    ratioState,
    targetRatio,
    triggerRatio,
    isEOA,
) => {
    const encoder = automationSdk.strategySubService.aaveV3Encode;

    const user = isEOA ? eoaAddr : proxy.address;

    const strategySub = encoder.leverageManagementWithoutSubProxy(
        bundleId, // strategyOrBundleId
        marketAddr, // marketAddr
        user, // user - EOA / SW, depending if it is EOA strategy
        ratioState, // ratioState -> 0 for boost, 1 for repay
        targetRatio, // targetRatio
        triggerRatio, // for trigger
        true, // isGeneric
    );

    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subAaveV3LeverageManagementOnPriceGeneric = async (
    proxy,
    user,
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
    marketAddr,
    targetRatio,
    triggerPrice,
    priceState,
    bundleId,
) => {
    const strategySub =
        automationSdk.strategySubService.aaveV3Encode.leverageManagementOnPriceGeneric(
            bundleId,
            triggerPrice,
            priceState,
            collAsset,
            collAssetId,
            debtAsset,
            debtAssetId,
            marketAddr,
            targetRatio,
            user,
        );

    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subAaveV3CloseGeneric = async (
    proxy,
    user,
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
    marketAddr,
    stopLossPrice,
    stopLossType,
    takeProfitPrice,
    takeProfitType,
    bundleId,
) => {
    const strategySub = automationSdk.strategySubService.aaveV3Encode.closeOnPriceGeneric(
        bundleId,
        collAsset,
        collAssetId,
        debtAsset,
        debtAssetId,
        marketAddr,
        user,
        stopLossPrice,
        stopLossType,
        takeProfitPrice,
        takeProfitType,
    );

    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subCompV2AutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
) => {
    const subInput = automationSdk.strategySubService.compoundV2Encode.leverageManagement(
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    const subData = await subToCompV2Proxy(proxy, [subInput]);

    let subId1 = '0';
    let subId2 = '0';

    if (boostEnabled) {
        subId1 = (parseInt(subData.subId, 10) - 1).toString();
        subId2 = subData.subId;
    } else {
        subId1 = subData.subId;
        subId2 = '0';
    }

    return {
        repaySubId: subId1,
        boostSubId: subId2,
        repaySub: subData.repaySub,
        boostSub: subData.boostSub,
    };
};

const subLiquityAutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
) => {
    const subInput = automationSdk.strategySubService.liquityEncode.leverageManagement(
        minRatio.toString(),
        maxRatio.toString(),
        optimalRatioBoost.toString(),
        optimalRatioRepay.toString(),
        boostEnabled,
    );

    const { latestSubId: subId, repaySub, boostSub } = await subToLiquityProxy(proxy, [subInput]);

    let repaySubId = '0';
    let boostSubId = '0';

    if (boostEnabled) {
        repaySubId = (parseInt(subId, 10) - 1).toString();
        boostSubId = subId;
    } else {
        repaySubId = subId;
        boostSubId = '0';
    }

    return {
        repaySubId,
        boostSubId,
        repaySub,
        boostSub,
    };
};

const subSparkAutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
) => {
    const subInput = automationSdk.strategySubService.sparkEncode.leverageManagement(
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    const { latestSubId: subId, boostSub, repaySub } = await subToSparkProxy(proxy, subInput);

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

    return {
        firstSub: subId1,
        secondSub: subId2,
        boostSub,
        repaySub,
    };
};

const updateSparkAutomationStrategy = async (
    proxy,
    subId1,
    subId2,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
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

    const subId = await updateSparkProxy(proxy, subInput);

    if (subId2 === '0' && boostEnabled === true) {
        subId2 = subId;
    }

    const sparkSubProxyAddr = await getContractFromRegistry('SparkSubProxy').then((e) => e.address);
    const { repaySub, boostSub } = await hre.ethers
        .getContractAt('SparkSubProxy', sparkSubProxyAddr)
        .then((c) => [c, c.parseSubData('0x'.concat(subInput.slice(18)))])
        .then(async ([c, subData]) => {
            subData = await subData;

            return {
                repaySub: await c.formatRepaySub(subData).then((s) => {
                    const triggerData = [
                        s.triggerData[0].replace(
                            sparkSubProxyAddr.slice(2).toLowerCase(),
                            proxy.address.slice(2),
                        ),
                    ];
                    return { ...s, triggerData, 2: triggerData };
                }),
                boostSub: await c.formatBoostSub(subData).then((s) => {
                    const triggerData = [
                        s.triggerData[0].replace(
                            sparkSubProxyAddr.slice(2).toLowerCase(),
                            proxy.address.slice(2),
                        ),
                    ];
                    return { ...s, triggerData, 2: triggerData };
                }),
            };
        });

    return {
        firstSub: subId1,
        secondSub: subId2,
        boostSub,
        repaySub,
    };
};

const subLiquityDsrPaybackStrategy = async ({ proxy, triggerRatio, targetRatio }) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.dsrPayback(
        proxy.address,
        triggerRatio,
        targetRatio,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subLiquityDebtInFrontRepayStrategy = async (proxy, debtInFront, targetRatioIncrease) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.debtInFrontRepay(
        proxy.address,
        debtInFront.toString(),
        targetRatioIncrease,
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subLiquityDsrSupplyStrategy = async ({ proxy, triggerRatio, targetRatio }) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.dsrSupply(
        proxy.address,
        triggerRatio,
        targetRatio,
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subAaveV3CloseWithMaximumGasPriceBundle = async (
    proxy,
    bundleId,
    triggerBaseAsset,
    triggerQuoteAsset,
    targetPrice,
    priceState,
    gasPrice,
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
        maximumGasPrice: gasPrice,
    };
    const subData = {
        collAsset: _collAsset,
        collAssetId: _collAssetId,
        debtAsset: _debtAsset,
        debtAssetId: _debtAssetId,
    };
    const strategySub =
        automationSdk.strategySubService.aaveV3Encode.closeToAssetWithMaximumGasPrice(
            bundleId,
            true,
            triggerData,
            subData,
        );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};
const subCurveUsdRepayBundle = async (
    proxy,
    controllerAddr,
    minRatio,
    targetRatio,
    collTokenAddress,
    crvUsdAddress,
) => {
    const strategySub = automationSdk.strategySubService.crvUSDEncode.leverageManagement(
        proxy.address,
        controllerAddr,
        automationSdk.enums.RatioState.UNDER,
        targetRatio,
        minRatio,
        collTokenAddress,
        crvUsdAddress,
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subCurveUsdPaybackStrategy = async (
    proxy,
    addressToPullTokensFrom,
    positionOwner,
    amountToPayback,
    curveUsdAddress,
    controllerAddr,
    minHealthRatio,
) => {
    const strategySub = automationSdk.strategySubService.crvUSDEncode.payback(
        proxy.address,
        addressToPullTokensFrom,
        positionOwner,
        amountToPayback,
        curveUsdAddress,
        controllerAddr,
        minHealthRatio,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subCurveUsdBoostBundle = async (
    proxy,
    controllerAddr,
    maxRatio,
    targetRatio,
    collTokenAddress,
    crvUsdAddress,
) => {
    const strategySub = automationSdk.strategySubService.crvUSDEncode.leverageManagement(
        proxy.address,
        controllerAddr,
        automationSdk.enums.RatioState.OVER,
        targetRatio,
        maxRatio,
        collTokenAddress,
        crvUsdAddress,
    );

    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};
const subMorphoBlueRepayBundle = async (
    proxy,
    bundleId,
    marketParams,
    marketId,
    minRatio,
    targetRatio,
    user,
) => {
    const triggerData = await createMorphoBlueRatioTrigger(
        marketId,
        user,
        minRatio,
        RATIO_STATE_UNDER,
    );
    const loanTokenEncoded = abiCoder.encode(['address'], [marketParams[0]]);
    const collateralTokenEncoded = abiCoder.encode(['address'], [marketParams[1]]);
    const oracleEncoded = abiCoder.encode(['address'], [marketParams[2]]);
    const irmEncoded = abiCoder.encode(['address'], [marketParams[3]]);
    const lltvEncoded = abiCoder.encode(['uint256'], [marketParams[4]]);
    const ratioStateEncoded = abiCoder.encode(['uint8'], [IN_REPAY]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const userEncoded = abiCoder.encode(['address'], [user]);
    const strategySub = [
        bundleId,
        true,
        [triggerData],
        [
            loanTokenEncoded,
            collateralTokenEncoded,
            oracleEncoded,
            irmEncoded,
            lltvEncoded,
            ratioStateEncoded,
            targetRatioEncoded,
            userEncoded,
        ],
    ];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};
const subMorphoBlueBoostBundle = async (
    proxy,
    bundleId,
    marketParams,
    marketId,
    maxRatio,
    targetRatio,
    user,
) => {
    const triggerData = await createMorphoBlueRatioTrigger(
        marketId,
        user,
        maxRatio,
        RATIO_STATE_OVER,
    );
    const loanTokenEncoded = abiCoder.encode(['address'], [marketParams[0]]);
    const collateralTokenEncoded = abiCoder.encode(['address'], [marketParams[1]]);
    const oracleEncoded = abiCoder.encode(['address'], [marketParams[2]]);
    const irmEncoded = abiCoder.encode(['address'], [marketParams[3]]);
    const lltvEncoded = abiCoder.encode(['uint256'], [marketParams[4]]);
    const ratioStateEncoded = abiCoder.encode(['uint8'], [IN_BOOST]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const userEncoded = abiCoder.encode(['address'], [user]);
    const strategySub = [
        bundleId,
        true,
        [triggerData],
        [
            loanTokenEncoded,
            collateralTokenEncoded,
            oracleEncoded,
            irmEncoded,
            lltvEncoded,
            ratioStateEncoded,
            targetRatioEncoded,
            userEncoded,
        ],
    ];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};
const subAaveV3OpenOrder = async (
    proxy,
    strategyOrBundleId,
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
    marketAddr,
    targetRatio,
    triggerPrice,
    isBundle = true,
) => {
    const strategySub = automationSdk.strategySubService.aaveV3Encode.openOrder(
        strategyOrBundleId,
        isBundle,
        {
            baseTokenAddress: collAsset,
            quoteTokenAddress: debtAsset,
            price: triggerPrice,
            state: RATIO_STATE_UNDER,
        },
        {
            collAsset,
            collAssetId,
            debtAsset,
            debtAssetId,
            marketAddr,
            targetRatio,
            useOnBehalf: false,
        },
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};
const subAaveV3FLCollateralSwitchStrategy = async (
    proxy,
    strategyId,
    fromAsset,
    fromAssetId,
    toAsset,
    toAssetId,
    marketAddr,
    amountToSwitch,
    baseTokenAddress,
    quoteTokenAddress,
    triggerPrice,
    priceState,
) => {
    const strategySub = automationSdk.strategySubService.aaveV3Encode.collateralSwitch(
        strategyId,
        fromAsset,
        fromAssetId,
        toAsset,
        toAssetId,
        marketAddr,
        amountToSwitch,
        baseTokenAddress,
        quoteTokenAddress,
        triggerPrice,
        priceState,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};
const subLiquityV2RepayBundle = async (
    proxy,
    market,
    troveId,
    collToken,
    minRatio,
    targetRatio,
    bundleId,
) => {
    const strategySub = automationSdk.strategySubService.liquityV2Encode.leverageManagement(
        market,
        troveId,
        collToken,
        BOLD_ADDR,
        automationSdk.enums.RatioState.UNDER,
        targetRatio,
        minRatio,
        bundleId,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};
const subLiquityV2BoostBundle = async (
    proxy,
    market,
    troveId,
    collToken,
    maxRatio,
    targetRatio,
    bundleId,
) => {
    const strategySub = automationSdk.strategySubService.liquityV2Encode.leverageManagement(
        market,
        troveId,
        collToken,
        BOLD_ADDR,
        automationSdk.enums.RatioState.OVER,
        targetRatio,
        maxRatio,
        bundleId,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};
const subLiquityV2CloseBundle = async (
    proxy,
    market,
    troveId,
    collToken,
    stopLossPrice,
    stopLossType,
    takeProfitPrice,
    takeProfitType,
    bundleId,
) => {
    const strategySub = automationSdk.strategySubService.liquityV2Encode.closeOnPrice(
        bundleId,
        market,
        troveId,
        collToken,
        BOLD_ADDR,
        stopLossPrice,
        stopLossType,
        takeProfitPrice,
        takeProfitType,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subLiquityV2InterestRateAdjustmentBundle = async (
    proxy,
    market,
    troveId,
    criticalDebtInFrontLimit,
    nonCriticalDebtInFrontLimit,
    interestRateChange,
) => {
    const strategySub = automationSdk.strategySubService.liquityV2Encode.interestRateAdjustment(
        market,
        troveId,
        criticalDebtInFrontLimit,
        nonCriticalDebtInFrontLimit,
        interestRateChange,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subMorphoBlueLeverageManagementOnPrice = async (
    proxy,
    strategyOrBundleId,
    marketParams,
    user,
    targetRatio,
    price,
    priceState,
    isBundle = true,
) => {
    const strategySub = automationSdk.strategySubService.morphoBlueEncode.leverageManagementOnPrice(
        strategyOrBundleId,
        isBundle,
        marketParams.loanToken,
        marketParams.collateralToken,
        marketParams.oracle,
        marketParams.irm,
        marketParams.lltv,
        user,
        targetRatio,
        price,
        priceState,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};
const subFluidVaultT1RepayBundle = async (
    proxy,
    bundleId,
    nftId,
    vault,
    targetRatio,
    triggerRatio,
) => {
    const strategySub = automationSdk.strategySubService.fluidEncode.leverageManagement(
        nftId,
        vault,
        automationSdk.enums.RatioState.UNDER,
        targetRatio,
        triggerRatio,
        bundleId,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};
const subFluidVaultT1BoostBundle = async (
    proxy,
    bundleId,
    nftId,
    vault,
    targetRatio,
    triggerRatio,
) => {
    const strategySub = automationSdk.strategySubService.fluidEncode.leverageManagement(
        nftId,
        vault,
        automationSdk.enums.RatioState.OVER,
        targetRatio,
        triggerRatio,
        bundleId,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

/**
 * This function uses the CompV3SubProxy/CompV3SubProxyL2 instead of SubProxy for legacy reasons.
 * This supports boost/repay bundles for proxy/eoa subscriptions for all networks.
 */
const subCompV3LeverageManagement = async (
    proxy,
    marketSymbol,
    triggerRepayRatio,
    triggerBoostRatio,
    targetRatioBoost,
    targetRatioRepay,
    boostEnabled,
    isEOA,
    subProxyContractAddr,
) => {
    const marketAddr = COMP_V3_MARKETS[chainIds[network]][marketSymbol];
    const debtAsset = getAssetInfo(
        marketSymbol === 'ETH' ? 'WETH' : marketSymbol,
        chainIds[network],
    );

    const isL2 = network !== 'mainnet';

    const encoder = isL2
        ? automationSdk.strategySubService.compoundV3L2Encode
        : automationSdk.strategySubService.compoundV3Encode;

    const subInput = encoder.leverageManagement(
        marketAddr,
        debtAsset.address,
        triggerRepayRatio,
        triggerBoostRatio,
        targetRatioBoost,
        targetRatioRepay,
        boostEnabled,
        isEOA,
    );

    const subProxyName = isL2 ? 'CompV3SubProxyL2' : 'CompV3SubProxy';
    const CompV3SubProxy = await hre.ethers.getContractFactory(subProxyName);
    const functionData = CompV3SubProxy.interface.encodeFunctionData('subToCompV3Automation', [
        subInput,
    ]);

    const receipt = await executeTxFromProxy(proxy, subProxyContractAddr, functionData);

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);
    console.log(
        `GasUsed subToCompV3Proxy; ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );

    const subId = await getLatestSubId();

    let subId1 = '0';
    let subId2 = '0';

    if (boostEnabled) {
        subId1 = (parseInt(subId, 10) - 1).toString();
        subId2 = subId;
    } else {
        subId1 = subId;
        subId2 = '0';
    }

    return { subData: subInput, repaySubId: subId1, boostSubId: subId2 };
};

const _subCompV3LeverageManagementOnPrice = async (
    proxy,
    eoaAddr,
    bundleId,
    marketSymbol,
    collSymbol,
    targetRatio,
    price,
    priceState,
    isEOA,
    ratioState,
) => {
    const marketAddr = COMP_V3_MARKETS[chainIds[network]][marketSymbol];

    const collAsset = getAssetInfo(collSymbol === 'ETH' ? 'WETH' : collSymbol, chainIds[network]);
    const debtAsset = getAssetInfo(
        marketSymbol === 'ETH' ? 'WETH' : marketSymbol,
        chainIds[network],
    );

    const user = isEOA ? eoaAddr : proxy.address;

    const strategySub = automationSdk.strategySubService.compoundV3Encode.leverageManagementOnPrice(
        bundleId,
        marketAddr,
        collAsset.address,
        debtAsset.address,
        targetRatio,
        price,
        priceState,
        ratioState,
        user,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subCompV3RepayOnPriceBundle = async (
    proxy,
    eoaAddr,
    bundleId,
    marketSymbol,
    collSymbol,
    targetRatio,
    price,
    priceState,
    isEOA,
) =>
    _subCompV3LeverageManagementOnPrice(
        proxy,
        eoaAddr,
        bundleId,
        marketSymbol,
        collSymbol,
        targetRatio,
        price,
        priceState,
        isEOA,
        automationSdk.enums.RatioState.UNDER,
    );

const subCompV3BoostOnPriceBundle = async (
    proxy,
    eoaAddr,
    bundleId,
    marketSymbol,
    collSymbol,
    targetRatio,
    price,
    priceState,
    isEOA,
) =>
    _subCompV3LeverageManagementOnPrice(
        proxy,
        eoaAddr,
        bundleId,
        marketSymbol,
        collSymbol,
        targetRatio,
        price,
        priceState,
        isEOA,
        automationSdk.enums.RatioState.OVER,
    );

const subCompV3CloseOnPriceBundle = async (
    proxy,
    bundleId,
    marketSymbol,
    collSymbol,
    stopLossPrice,
    takeProfitPrice,
    stopLossType,
    takeProfitType,
    user,
) => {
    const marketAddr = COMP_V3_MARKETS[chainIds[network]][marketSymbol];
    const collAsset = getAssetInfo(collSymbol === 'ETH' ? 'WETH' : collSymbol, chainIds[network]);
    const debtAsset = getAssetInfo(
        marketSymbol === 'ETH' ? 'WETH' : marketSymbol,
        chainIds[network],
    );
    const strategySub = automationSdk.strategySubService.compoundV3Encode.closeOnPrice(
        bundleId,
        marketAddr,
        collAsset.address,
        debtAsset.address,
        stopLossPrice,
        stopLossType,
        takeProfitPrice,
        takeProfitType,
        user,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subSparkCloseGeneric = async (
    proxy,
    user,
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
    marketAddr,
    stopLossPrice,
    stopLossType,
    takeProfitPrice,
    takeProfitType,
    bundleId,
) => {
    const strategySub = automationSdk.strategySubService.sparkEncode.closeOnPriceGeneric(
        bundleId,
        collAsset,
        collAssetId,
        debtAsset,
        debtAssetId,
        marketAddr,
        user,
        stopLossPrice,
        stopLossType,
        takeProfitPrice,
        takeProfitType,
    );

    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subMorphoBlueClose = async (
    proxy,
    user,
    loanToken,
    collateralToken,
    oracle,
    irm,
    lltv,
    stopLossPrice,
    stopLossType,
    takeProfitPrice,
    takeProfitType,
    bundleId,
) => {
    const strategySub = automationSdk.strategySubService.morphoBlueEncode.closeOnPrice(
        bundleId,
        loanToken,
        collateralToken,
        oracle,
        irm,
        lltv,
        user,
        stopLossPrice,
        stopLossType,
        takeProfitPrice,
        takeProfitType,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const _subSparkLeverageManagementOnPrice = async (
    proxy,
    bundleId,
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
    marketAddr,
    price,
    ratioState,
    targetRatio,
) => {
    const triggerData = {
        baseTokenAddr: collAsset,
        quoteTokenAddr: debtAsset,
        price,
        ratioState,
    };
    const subData = {
        collAsset,
        collAssetId,
        debtAsset,
        debtAssetId,
        marketAddr,
        targetRatio,
    };
    const strategySub = automationSdk.strategySubService.sparkEncode.leverageManagementOnPrice(
        bundleId,
        true,
        triggerData,
        subData,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subSparkRepayOnPriceBundle = async (
    proxy,
    bundleId,
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
    marketAddr,
    price,
    ratioState,
    targetRatio,
) =>
    _subSparkLeverageManagementOnPrice(
        proxy,
        bundleId,
        collAsset,
        collAssetId,
        debtAsset,
        debtAssetId,
        marketAddr,
        price,
        ratioState,
        targetRatio,
    );

const subSparkBoostOnPriceBundle = async (
    proxy,
    bundleId,
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
    marketAddr,
    price,
    ratioState,
    targetRatio,
) =>
    _subSparkLeverageManagementOnPrice(
        proxy,
        bundleId,
        collAsset,
        collAssetId,
        debtAsset,
        debtAssetId,
        marketAddr,
        price,
        ratioState,
        targetRatio,
    );

module.exports = {
    subDcaStrategy,
    subMcdCloseToCollStrategy,
    subRepayFromSavingsStrategy,
    subLimitOrderStrategy,
    subMcdCloseToDaiStrategy,
    subMcdTrailingCloseToDaiStrategy,
    subLiquityCloseToCollStrategy,
    subLiquityTrailingCloseToCollStrategy,
    subMcdTrailingCloseToCollStrategy,
    subLiquityAutomationStrategy,
    subAaveV2AutomationStrategy,
    subAaveV3AutomationStrategy,
    subAaveV3LeverageManagementGeneric,
    subAaveV3LeverageManagementOnPriceGeneric,
    subAaveV3CloseGeneric,
    subCompV2AutomationStrategy,
    subSparkAutomationStrategy,
    updateSparkAutomationStrategy,
    subLiquityDsrPaybackStrategy,
    subLiquityDsrSupplyStrategy,
    subLiquityDebtInFrontRepayStrategy,
    subAaveV3CloseWithMaximumGasPriceBundle,
    subCurveUsdRepayBundle,
    subCurveUsdBoostBundle,
    subCurveUsdPaybackStrategy,
    subMorphoBlueBoostBundle,
    subMorphoBlueRepayBundle,
    subAaveV3OpenOrder,
    subLiquityV2RepayBundle,
    subLiquityV2BoostBundle,
    subLiquityV2CloseBundle,
    subLiquityV2InterestRateAdjustmentBundle,
    subMorphoBlueLeverageManagementOnPrice,
    subFluidVaultT1RepayBundle,
    subFluidVaultT1BoostBundle,
    subCompV3LeverageManagement,
    subCompV3RepayOnPriceBundle,
    subCompV3BoostOnPriceBundle,
    subCompV3CloseOnPriceBundle,
    subAaveV3FLCollateralSwitchStrategy,
    subSparkCloseGeneric,
    subMorphoBlueClose,
    subSparkRepayOnPriceBundle,
    subSparkBoostOnPriceBundle,
};
