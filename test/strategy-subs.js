/* eslint-disable max-len */
const hre = require('hardhat');
const automationSdk = require('@defisaver/automation-sdk');

const {
    subToStrategy,
    subToCompV3Proxy,
    subToCompV2Proxy,
    subToCBRebondProxy,
    subToLimitOrderProxy,
    subToMorphoAaveV2Proxy,
    subToLiquityProxy,
    subToAaveV2Proxy,
    subToSparkProxy,
    updateSparkProxy,
    subToAaveV3Proxy,
} = require('./utils-strategies');

const {
    createUniV3RangeOrderTrigger,
    createTimestampTrigger,
    createGasPriceTrigger,
    createReflexerTrigger,
    RATIO_STATE_UNDER,
    RATIO_STATE_OVER,
    IN_REPAY,
    IN_BOOST,
    createMorphoBlueRatioTrigger,
    createCurveUsdHealthRatioTrigger,
} = require('./triggers');

const {
    REGISTRY_ADDR,
    DAI_ADDR,
    WBTC_ADDR,
    WETH_ADDRESS,
    LUSD_ADDR,
    USDC_ADDR,
    BLUSD_ADDR,
    addrs,
    getNetwork,
    getContractFromRegistry,
    chainIds,
} = require('./utils');

const abiCoder = new hre.ethers.utils.AbiCoder();

// eslint-disable-next-line max-len
const subUniContinuousCollectStrategy = async (proxy, strategyId, tokenId, recipient, timestamp, maxGasPrice, interval) => {
    const isBundle = false;

    const tokenIdEncoded = abiCoder.encode(['uint256'], [tokenId.toString()]);
    const recipientEncoded = abiCoder.encode(['address'], [recipient]);

    const timestampTriggerData = await createTimestampTrigger(timestamp, interval);
    const gasTriggerData = await createGasPriceTrigger(maxGasPrice);
    const strategySub = [strategyId, isBundle, [timestampTriggerData, gasTriggerData], [tokenIdEncoded, recipientEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

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
        chainIds[getNetwork()],
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subUniV3RangeOrderStrategy = async (proxy, tokenId, state, recipient, strategyId) => {
    const isBundle = false;

    const tokenIdEncoded = abiCoder.encode(['uint256'], [tokenId.toString()]);
    const recipientEncoded = abiCoder.encode(['address'], [recipient]);

    const triggerData = await createUniV3RangeOrderTrigger(tokenId, state);
    const strategySub = [strategyId, isBundle, [triggerData], [tokenIdEncoded, recipientEncoded]];
    // eslint-disable-next-line max-len
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subRepayFromSavingsStrategy = async (proxy, bundleId, vaultId, rationUnder, targetRatio, regAddr = REGISTRY_ADDR) => {
    const strategySub = automationSdk.strategySubService.makerEncode.repayFromSavings(
        bundleId,
        vaultId,
        rationUnder,
        targetRatio,
    );
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subMcdCloseToDaiStrategy = async (vaultId, proxy, targetPrice, chainlinkCollAddress, tokenState, regAddr = REGISTRY_ADDR) => {
    const strategySub = automationSdk.strategySubService.makerEncode.closeOnPrice(
        vaultId,
        tokenState === 1 ? automationSdk.enums.RatioState.UNDER : automationSdk.enums.RatioState.OVER,
        targetPrice.toString(),
        DAI_ADDR,
        chainlinkCollAddress,
    );
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subMcdTrailingCloseToDaiStrategy = async (vaultId, proxy, tokenAddress, percentage, roundId, regAddr = REGISTRY_ADDR) => {
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
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subMcdCloseToCollStrategy = async (vaultId, proxy, targetPrice, tokenAddress, ratioState, regAddr = REGISTRY_ADDR) => {
    let chainlinkTokenAddr = tokenAddress;
    if (tokenAddress.toLowerCase() === WBTC_ADDR.toLowerCase()) {
        chainlinkTokenAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
    }
    const strategySub = automationSdk.strategySubService.makerEncode.closeOnPrice(
        vaultId,
        ratioState === 1 ? automationSdk.enums.RatioState.UNDER : automationSdk.enums.RatioState.OVER,
        targetPrice.toString(),
        tokenAddress,
        chainlinkTokenAddr,
    );
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subMcdTrailingCloseToCollStrategy = async (vaultId, proxy, tokenAddress, percentage, roundId, regAddr = REGISTRY_ADDR) => {
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
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subLiquityCloseToCollStrategy = async (proxy, targetPrice, tokenState, regAddr = REGISTRY_ADDR) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.closeOnPrice(
        tokenState === 1 ? automationSdk.enums.RatioState.UNDER : automationSdk.enums.RatioState.OVER,
        targetPrice,
        WETH_ADDRESS,
        WETH_ADDRESS,
        chainIds[getNetwork()],
    );
    const subId = await subToStrategy(proxy, strategySub, regAddr);
    return { subId, strategySub };
};

const subLiquityTrailingCloseToCollStrategy = async (proxy, percentage, roundId, regAddr = REGISTRY_ADDR) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.trailingStop(
        percentage,
        WETH_ADDRESS,
        WETH_ADDRESS,
        roundId,
        chainIds[getNetwork()],
    );
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

// eslint-disable-next-line max-len
const subLimitOrderStrategy = async (proxy, tokenAddrSell, tokenAddrBuy, amount, targetPrice, goodUntilDuration, orderType, regAddr = REGISTRY_ADDR) => {
    const subInput = automationSdk.strategySubService.exchangeEncode.limitOrder(
        tokenAddrSell,
        tokenAddrBuy,
        amount,
        targetPrice,
        goodUntilDuration,
        orderType,
    );

    const { subId, strategySub } = await subToLimitOrderProxy(proxy, [subInput], regAddr);

    return { subId, strategySub };
};

const subReflexerBoostStrategy = async (proxy, safeId, ratioOver, targetRatio, bundleId) => {
    const isBundle = true;

    const safeIdEncoded = abiCoder.encode(['uint256'], [safeId.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);

    const triggerData = await createReflexerTrigger(safeId, ratioOver, RATIO_STATE_OVER);
    const strategySub = [bundleId, isBundle, [triggerData], [safeIdEncoded, targetRatioEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subReflexerRepayStrategy = async (proxy, safeId, ratioUnder, targetRatio, bundleId) => {
    const isBundle = true;

    const safeIdEncoded = abiCoder.encode(['uint256'], [safeId.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);

    const triggerData = await createReflexerTrigger(safeId, ratioUnder, RATIO_STATE_UNDER);
    const strategySub = [bundleId, isBundle, [triggerData], [safeIdEncoded, targetRatioEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subCompV3AutomationStrategy = async (
    proxy,
    market,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    isEOA,
    regAddr = REGISTRY_ADDR,
) => {
    const subInput = automationSdk.strategySubService.compoundV3Encode.leverageManagement(
        market,
        USDC_ADDR,
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
        isEOA,
    );

    const subId = await subToCompV3Proxy(proxy, [subInput], regAddr);

    let subId1 = '0';
    let subId2 = '0';

    if (boostEnabled) {
        subId1 = (parseInt(subId, 10) - 1).toString();
        subId2 = subId;
    } else {
        subId1 = subId;
        subId2 = '0';
    }

    return { firstSub: subId1, secondSub: subId2 };
};

const subAaveV2AutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    regAddr = REGISTRY_ADDR,
) => {
    const subInput = automationSdk.strategySubService.aaveV2Encode.leverageManagement(
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );
    const subData = await subToAaveV2Proxy(proxy, [subInput], regAddr);

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
    regAddr = REGISTRY_ADDR,
) => {
    const minRatioBytes = hre.ethers.utils.zeroPad(hre.ethers.BigNumber.from(minRatio), 16);
    const maxRatioBytes = hre.ethers.utils.zeroPad(hre.ethers.BigNumber.from(maxRatio), 16);
    const optimalRatioBoostBytes = hre.ethers.utils.zeroPad(hre.ethers.BigNumber.from(optimalRatioBoost), 16);
    const optimalRatioRepayBytes = hre.ethers.utils.zeroPad(hre.ethers.BigNumber.from(optimalRatioRepay), 16);
    const boostEnabledBytes = boostEnabled ? '0x01' : '0x00';
    const subInput = hre.ethers.utils.concat([
        minRatioBytes,
        maxRatioBytes,
        optimalRatioBoostBytes,
        optimalRatioRepayBytes,
        boostEnabledBytes,
    ]);

    const subData = await subToAaveV3Proxy(proxy, subInput, regAddr);

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

const subCompV2AutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    regAddr = REGISTRY_ADDR,
) => {
    const subInput = automationSdk.strategySubService.compoundV2Encode.leverageManagement(
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    const subData = await subToCompV2Proxy(proxy, [subInput], regAddr);

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

const subCbRebondStrategy = async (proxy, bondID, strategyId, regAddr = REGISTRY_ADDR) => {
    const inputData = automationSdk.subDataService.cBondsRebondSubData.encode(bondID);

    const subId = await subToCBRebondProxy(proxy, inputData, regAddr);

    const isBundle = false;
    const subIDEncoded = abiCoder.encode(['uint256'], [subId.toString()]);
    const bondIDEncoded = abiCoder.encode(['uint256'], [bondID.toString()]);
    const bLusdTokenEncoded = abiCoder.encode(['address'], [BLUSD_ADDR]);
    const lusdTokenEncoded = abiCoder.encode(['address'], [LUSD_ADDR]);

    const triggerData = automationSdk.triggerService.cBondsRebondTrigger.encode(bondID);

    const strategySub = [strategyId, isBundle, triggerData, [subIDEncoded, bondIDEncoded, bLusdTokenEncoded, lusdTokenEncoded]];

    return { subId, strategySub };
};

const subLiquityCBPaybackStrategy = async (proxy, sourceId, sourceType, triggerRatio, triggerState) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.paybackFromChickenBondStrategySub(
        proxy.address,
        triggerRatio,
        sourceId,
        sourceType,
        triggerState === 1 ? automationSdk.enums.RatioState.UNDER : automationSdk.enums.RatioState.OVER,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subMorphoAaveV2AutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    regAddr = REGISTRY_ADDR,
) => {
    const subInput = automationSdk.strategySubService.morphoAaveV2Encode.leverageManagement(
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );
    const { latestSubId: subId, repaySub, boostSub } = await subToMorphoAaveV2Proxy(proxy, [subInput], regAddr);

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

const subLiquityAutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
    regAddr = REGISTRY_ADDR,
) => {
    const subInput = automationSdk.strategySubService.liquityEncode.leverageManagement(
        minRatio.toString(),
        maxRatio.toString(),
        optimalRatioBoost.toString(),
        optimalRatioRepay.toString(),
        boostEnabled,
    );

    const { latestSubId: subId, repaySub, boostSub } = await subToLiquityProxy(proxy, [subInput], regAddr);

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
    regAddr = addrs[getNetwork()].REGISTRY_ADDR,
) => {
    const subInput = automationSdk.strategySubService.sparkEncode.leverageManagement(
        minRatio,
        maxRatio,
        optimalRatioBoost,
        optimalRatioRepay,
        boostEnabled,
    );

    const { latestSubId: subId, boostSub, repaySub } = await subToSparkProxy(
        proxy, subInput, regAddr,
    );

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
        firstSub: subId1, secondSub: subId2, boostSub, repaySub,
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
    regAddr = addrs[getNetwork()].REGISTRY_ADDR,
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

    const subId = await updateSparkProxy(proxy, subInput, regAddr);

    if (subId2 === '0' && boostEnabled === true) {
        // eslint-disable-next-line no-param-reassign
        subId2 = subId;
    }

    const sparkSubProxyAddr = await getContractFromRegistry('SparkSubProxy').then((e) => e.address);
    const { repaySub, boostSub } = await hre.ethers.getContractAt('SparkSubProxy', sparkSubProxyAddr)
        .then((c) => [c, c.parseSubData('0x'.concat(subInput.slice(18)))])
        .then(async ([c, subData]) => {
            // eslint-disable-next-line no-param-reassign
            subData = await subData;

            return ({
                repaySub: await c.formatRepaySub(subData).then((s) => {
                    const triggerData = [s.triggerData[0]
                        .replace(sparkSubProxyAddr.slice(2).toLowerCase(), proxy.address.slice(2))];
                    return { ...s, triggerData, 2: triggerData };
                }),
                boostSub: await c.formatBoostSub(subData).then((s) => {
                    const triggerData = [s.triggerData[0]
                        .replace(sparkSubProxyAddr.slice(2).toLowerCase(), proxy.address.slice(2))];
                    return { ...s, triggerData, 2: triggerData };
                }),
            });
        });

    return {
        firstSub: subId1, secondSub: subId2, boostSub, repaySub,
    };
};

const subSparkCloseBundle = async (
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
    const strategySub = automationSdk.strategySubService.sparkEncode.closeToAsset(
        bundleId,
        true,
        triggerData,
        subData,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subLiquityDsrPaybackStrategy = async ({
    proxy, triggerRatio, targetRatio,
}) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.dsrPayback(
        proxy.address,
        triggerRatio,
        targetRatio,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subLiquityDebtInFrontRepayStrategy = async (
    proxy, debtInFront, targetRatioIncrease,
) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.debtInFrontRepay(
        proxy.address,
        debtInFront.toString(),
        targetRatioIncrease,
    );
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subLiquityDsrSupplyStrategy = async ({
    proxy, triggerRatio, targetRatio,
}) => {
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
        ratioState: (priceState === 1) ? automationSdk.enums.RatioState.UNDER : automationSdk.enums.RatioState.OVER,
        maximumGasPrice: gasPrice,
    };
    const subData = {
        collAsset: _collAsset,
        collAssetId: _collAssetId,
        debtAsset: _debtAsset,
        debtAssetId: _debtAssetId,
    };
    const strategySub = automationSdk.strategySubService.aaveV3Encode.closeToAssetWithMaximumGasPrice(
        bundleId,
        true,
        triggerData,
        subData,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};
const subCurveUsdRepayBundle = async (
    proxy, controllerAddr, minRatio, targetRatio, collTokenAddress, crvUsdAddress,
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
    proxy, controllerAddr, maxRatio, targetRatio, collTokenAddress, crvUsdAddress,
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
    proxy, bundleId, marketParams, marketId, minRatio, targetRatio, user,
) => {
    const triggerData = await createMorphoBlueRatioTrigger(marketId, user, minRatio, RATIO_STATE_UNDER);
    const loanTokenEncoded = abiCoder.encode(['address'], [marketParams[0]]);
    const collateralTokenEncoded = abiCoder.encode(['address'], [marketParams[1]]);
    const oracleEncoded = abiCoder.encode(['address'], [marketParams[2]]);
    const irmEncoded = abiCoder.encode(['address'], [marketParams[3]]);
    const lltvEncoded = abiCoder.encode(['uint256'], [marketParams[4]]);
    const ratioStateEncoded = abiCoder.encode(['uint8'], [IN_REPAY]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const userEncoded = abiCoder.encode(['address'], [user]);
    const strategySub = [bundleId, true, [triggerData],
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
    proxy, bundleId, marketParams, marketId, maxRatio, targetRatio, user,
) => {
    const triggerData = await createMorphoBlueRatioTrigger(marketId, user, maxRatio, RATIO_STATE_OVER);
    const loanTokenEncoded = abiCoder.encode(['address'], [marketParams[0]]);
    const collateralTokenEncoded = abiCoder.encode(['address'], [marketParams[1]]);
    const oracleEncoded = abiCoder.encode(['address'], [marketParams[2]]);
    const irmEncoded = abiCoder.encode(['address'], [marketParams[3]]);
    const lltvEncoded = abiCoder.encode(['uint256'], [marketParams[4]]);
    const ratioStateEncoded = abiCoder.encode(['uint8'], [IN_BOOST]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const userEncoded = abiCoder.encode(['address'], [user]);
    const strategySub = [bundleId, true, [triggerData],
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

module.exports = {
    subDcaStrategy,
    subMcdCloseToCollStrategy,
    subRepayFromSavingsStrategy,
    subLimitOrderStrategy,
    subUniV3RangeOrderStrategy,
    subMcdCloseToDaiStrategy,
    subMcdTrailingCloseToDaiStrategy,
    subUniContinuousCollectStrategy,
    subReflexerBoostStrategy,
    subReflexerRepayStrategy,
    subLiquityCloseToCollStrategy,
    subLiquityTrailingCloseToCollStrategy,
    subMcdTrailingCloseToCollStrategy,
    subCompV3AutomationStrategy,
    subCbRebondStrategy,
    subLiquityCBPaybackStrategy,
    subMorphoAaveV2AutomationStrategy,
    subLiquityAutomationStrategy,
    subAaveV2AutomationStrategy,
    subAaveV3AutomationStrategy,
    subCompV2AutomationStrategy,
    subSparkAutomationStrategy,
    updateSparkAutomationStrategy,
    subSparkCloseBundle,
    subLiquityDsrPaybackStrategy,
    subLiquityDsrSupplyStrategy,
    subLiquityDebtInFrontRepayStrategy,
    subAaveV3CloseWithMaximumGasPriceBundle,
    subCurveUsdRepayBundle,
    subCurveUsdBoostBundle,
    subCurveUsdPaybackStrategy,
    subMorphoBlueBoostBundle,
    subMorphoBlueRepayBundle,
};
