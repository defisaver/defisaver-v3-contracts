/* eslint-disable max-len */
const hre = require('hardhat');

const { defaultAbiCoder } = require('ethers/lib/utils');
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
} = require('./utils-strategies');

const {
    createUniV3RangeOrderTrigger,
    createMcdTrigger,
    createChainLinkPriceTrigger,
    createTimestampTrigger,
    createGasPriceTrigger,
    createReflexerTrigger,
    createLiquityTrigger,
    createTrailingStopTrigger,
    createCbRebondTrigger,
    createMorphoTrigger,
    createDebtInFrontWithLimitTrigger,
    RATIO_STATE_UNDER,
    RATIO_STATE_OVER,
    IN_REPAY,
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
    nullAddress,
} = require('./utils');

const { MCD_MANAGER_ADDR } = require('./utils-mcd');

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
    strategyId,
) => {
    const isBundle = false;

    const tokenAddrSellEncoded = abiCoder.encode(['address'], [tokenAddrSell]);
    const tokenAddrBuyEncoded = abiCoder.encode(['address'], [tokenAddrBuy]);
    const amountEncoded = abiCoder.encode(['uint256'], [amount]);
    const intervalEncoded = abiCoder.encode(['uint256'], [interval]);

    const triggerData = await createTimestampTrigger(lastTimestamp, interval);

    const strategySub = [
        strategyId,
        isBundle,
        [triggerData],
        [
            tokenAddrSellEncoded,
            tokenAddrBuyEncoded,
            amountEncoded,
            intervalEncoded,
        ],
    ];
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

const subMcdRepayStrategy = async (proxy, bundleId, vaultId, rationUnder, targetRatio, isBundle, regAddr = REGISTRY_ADDR) => {
    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);

    const triggerData = await createMcdTrigger(vaultId, rationUnder, RATIO_STATE_UNDER);
    const strategySub = [bundleId, isBundle, [triggerData], [vaultIdEncoded, targetRatioEncoded]];

    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subRepayFromSavingsStrategy = async (proxy, bundleId, vaultId, rationUnder, targetRatio, isBundle, regAddr = REGISTRY_ADDR) => {
    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const daiAddrEncoded = abiCoder.encode(['address'], [DAI_ADDR]);
    const mcdManagerAddrEncoded = abiCoder.encode(['address'], [MCD_MANAGER_ADDR]);

    const triggerData = await createMcdTrigger(vaultId, rationUnder, RATIO_STATE_UNDER);
    const strategySub = [bundleId, isBundle, [triggerData], [vaultIdEncoded, targetRatioEncoded, daiAddrEncoded, mcdManagerAddrEncoded]];

    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subMcdBoostStrategy = async (proxy, bundleId, vaultId, rationUnder, targetRatio, isBundle) => {
    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);

    const triggerData = await createMcdTrigger(vaultId, rationUnder, RATIO_STATE_OVER);
    const strategySub = [bundleId, isBundle, [triggerData], [vaultIdEncoded, targetRatioEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subMcdCloseToDaiStrategy = async (vaultId, proxy, targetPrice, tokenAddress, tokenState, strategyId, regAddr = REGISTRY_ADDR) => {
    const isBundle = false;

    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const daiEncoded = abiCoder.encode(['address'], [DAI_ADDR]);
    const mcdManagerEncoded = abiCoder.encode(['address'], [MCD_MANAGER_ADDR]);

    const triggerData = await createChainLinkPriceTrigger(
        tokenAddress, targetPrice, tokenState,
    );
    const strategySub = [strategyId, isBundle, [triggerData], [vaultIdEncoded, daiEncoded, mcdManagerEncoded]];
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subMcdTrailingCloseToDaiStrategy = async (vaultId, proxy, tokenAddress, percentage, roundId, strategyId, regAddr = REGISTRY_ADDR) => {
    const isBundle = false;

    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const daiEncoded = abiCoder.encode(['address'], [DAI_ADDR]);
    const mcdManagerEncoded = abiCoder.encode(['address'], [MCD_MANAGER_ADDR]);

    let chainlinkTokenAddr = tokenAddress;
    if (tokenAddress.toLowerCase() === WBTC_ADDR.toLowerCase()) {
        chainlinkTokenAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
    }

    const triggerData = await createTrailingStopTrigger(
        chainlinkTokenAddr, percentage, roundId,
    );

    const strategySub = [strategyId, isBundle, [triggerData], [vaultIdEncoded, daiEncoded, mcdManagerEncoded]];
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subMcdCloseToCollStrategy = async (vaultId, proxy, targetPrice, tokenAddress, tokenState, strategyId, regAddr = REGISTRY_ADDR) => {
    const isBundle = false;

    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const collEncoded = abiCoder.encode(['address'], [tokenAddress]);
    const daiEncoded = abiCoder.encode(['address'], [DAI_ADDR]);
    const mcdManagerEncoded = abiCoder.encode(['address'], [MCD_MANAGER_ADDR]);

    let chainlinkTokenAddr = tokenAddress;
    if (tokenAddress.toLowerCase() === WBTC_ADDR.toLowerCase()) {
        chainlinkTokenAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
    }

    const triggerData = await createChainLinkPriceTrigger(
        chainlinkTokenAddr, targetPrice, tokenState,
    );
    const strategySub = [strategyId, isBundle, [triggerData], [vaultIdEncoded, collEncoded, daiEncoded, mcdManagerEncoded]];
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subMcdTrailingCloseToCollStrategy = async (vaultId, proxy, tokenAddress, percentage, roundId, strategyId, regAddr = REGISTRY_ADDR) => {
    const isBundle = false;

    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const collEncoded = abiCoder.encode(['address'], [tokenAddress]);
    const daiEncoded = abiCoder.encode(['address'], [DAI_ADDR]);
    const mcdManagerEncoded = abiCoder.encode(['address'], [MCD_MANAGER_ADDR]);

    let chainlinkTokenAddr = tokenAddress;
    if (tokenAddress.toLowerCase() === WBTC_ADDR.toLowerCase()) {
        chainlinkTokenAddr = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
    }

    const triggerData = await createTrailingStopTrigger(
        chainlinkTokenAddr, percentage, roundId,
    );
    const strategySub = [strategyId, isBundle, [triggerData], [vaultIdEncoded, collEncoded, daiEncoded, mcdManagerEncoded]];
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subLiquityCloseToCollStrategy = async (proxy, targetPrice, tokenState, strategyId, regAddr = REGISTRY_ADDR) => {
    const isBundle = false;

    const wethEncoded = abiCoder.encode(['address'], [WETH_ADDRESS]);
    const lusdEncoded = abiCoder.encode(['address'], [LUSD_ADDR]);

    const triggerData = await createChainLinkPriceTrigger(
        WETH_ADDRESS, targetPrice, tokenState,
    );
    const strategySub = [strategyId, isBundle, [triggerData], [wethEncoded, lusdEncoded]];
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

const subLiquityTrailingCloseToCollStrategy = async (proxy, percentage, roundId, strategyId, regAddr = REGISTRY_ADDR) => {
    const isBundle = false;

    const wethEncoded = abiCoder.encode(['address'], [WETH_ADDRESS]);
    const lusdEncoded = abiCoder.encode(['address'], [LUSD_ADDR]);

    const triggerData = await createTrailingStopTrigger(
        WETH_ADDRESS, percentage, roundId,
    );

    const strategySub = [strategyId, isBundle, [triggerData], [wethEncoded, lusdEncoded]];
    const subId = await subToStrategy(proxy, strategySub, regAddr);

    return { subId, strategySub };
};

// eslint-disable-next-line max-len
const subLimitOrderStrategy = async (proxy, tokenAddrSell, tokenAddrBuy, amount, targetPrice, goodUntilDuration, orderType, regAddr = REGISTRY_ADDR) => {
    const subInput = [[tokenAddrSell, tokenAddrBuy, amount, targetPrice, goodUntilDuration, orderType]];

    const { subId, strategySub } = await subToLimitOrderProxy(proxy, subInput, regAddr);

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
    const subInput = [[market, USDC_ADDR, minRatio, maxRatio, optimalRatioBoost, optimalRatioRepay, boostEnabled, isEOA]];

    const subId = await subToCompV3Proxy(proxy, subInput, regAddr);

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
    const subInput = [[minRatio, maxRatio, optimalRatioBoost, optimalRatioRepay, boostEnabled]];

    const subData = await subToAaveV2Proxy(proxy, subInput, regAddr);

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
    const subInput = [[minRatio, maxRatio, optimalRatioBoost, optimalRatioRepay, boostEnabled]];

    const subData = await subToCompV2Proxy(proxy, subInput, regAddr);

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
    const inputData = [bondID.toString()];

    const subId = await subToCBRebondProxy(proxy, inputData, regAddr);

    const isBundle = false;
    const subIDEncoded = abiCoder.encode(['uint256'], [subId.toString()]);
    const bondIDEncoded = abiCoder.encode(['uint256'], [bondID.toString()]);
    const bLusdTokenEncoded = abiCoder.encode(['address'], [BLUSD_ADDR]);
    const lusdTokenEncoded = abiCoder.encode(['address'], [LUSD_ADDR]);

    const triggerData = await createCbRebondTrigger(bondID);

    const strategySub = [strategyId, isBundle, [triggerData], [subIDEncoded, bondIDEncoded, bLusdTokenEncoded, lusdTokenEncoded]];

    return { subId, strategySub };
};

const subLiquityCBPaybackStrategy = async (proxy, bundleId, sourceId, sourceType, triggerRatio, triggerState) => {
    const isBundle = true;
    const sourceIdEncoded = abiCoder.encode(['uint256'], [sourceId.toString()]);
    const sourceTypeEncoded = abiCoder.encode(['uint256'], [sourceType.toString()]);
    const lusdTokenEncoded = abiCoder.encode(['address'], [LUSD_ADDR]);
    const bLusdTokenEncoded = abiCoder.encode(['address'], [BLUSD_ADDR]);

    const triggerData = await createLiquityTrigger(proxy.address, triggerRatio.toString(), triggerState.toString());

    const strategySub = [bundleId, isBundle, [triggerData], [sourceIdEncoded, sourceTypeEncoded, lusdTokenEncoded, bLusdTokenEncoded]];
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
    const subInput = [[minRatio, maxRatio, optimalRatioBoost, optimalRatioRepay, boostEnabled]];

    const { latestSubId: subId, repaySub, boostSub } = await subToMorphoAaveV2Proxy(proxy, subInput, regAddr);

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

const subMorphoAaveV2BoostStrategy = async ({
    proxy,
    bundleId,
    user,
    triggerRatio,
}) => {
    const triggerData = await createMorphoTrigger(user, triggerRatio, RATIO_STATE_OVER);
    const strategySub = [
        bundleId,
        true,
        [triggerData],
        [],
    ];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subMorphoAaveV2RepayStrategy = async ({
    proxy,
    bundleId,
    user,
    triggerRatio,
}) => {
    const triggerData = await createMorphoTrigger(user, triggerRatio, RATIO_STATE_UNDER);
    const strategySub = [
        bundleId,
        true,
        [triggerData],
        [],
    ];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
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
    const subInput = [[minRatio, maxRatio, optimalRatioBoost, optimalRatioRepay, boostEnabled]];

    const { latestSubId: subId, repaySub, boostSub } = await subToLiquityProxy(proxy, subInput, regAddr);

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
    let subInput = '0x';

    subInput = subInput.concat(minRatio.padStart(32, '0'));
    subInput = subInput.concat(maxRatio.padStart(32, '0'));
    subInput = subInput.concat(optimalRatioBoost.padStart(32, '0'));
    subInput = subInput.concat(optimalRatioRepay.padStart(32, '0'));
    subInput = subInput.concat(boostEnabled ? '01' : '00');

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
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
) => {
    const triggerData = abiCoder.encode(['address', 'address', 'uint256', 'uint8'], [triggerBaseAsset, triggerQuoteAsset, targetPrice, priceState]);

    const strategySub = [bundleId, true, [triggerData], [
        abiCoder.encode(['address'], [collAsset]),
        abiCoder.encode(['uint16'], [collAssetId.toString()]),
        abiCoder.encode(['address'], [debtAsset]),
        abiCoder.encode(['uint16'], [debtAssetId.toString()]),
        abiCoder.encode(['address'], [nullAddress]), // needed so we dont have to trust injection
    ]];

    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subLiqutityDsrPaybackStrategy = async ({
    proxy, strategyId, triggerRatio, targetRatio,
}) => {
    const ratioStateEncoded = abiCoder.encode(['uint8'], [IN_REPAY]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const daiAddressEncoded = abiCoder.encode(['address'], [DAI_ADDR]);
    const lusdAddressEncoded = abiCoder.encode(['address'], [LUSD_ADDR]);

    const triggerData = await createLiquityTrigger(proxy.address, triggerRatio, RATIO_STATE_UNDER);
    const strategySub = [strategyId, false, [triggerData], [ratioStateEncoded, targetRatioEncoded, daiAddressEncoded, lusdAddressEncoded]];

    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subLiquityDebtInFrontRepayStrategy = async (
    proxy, strategyId, debtInFront, targetRatioIncrease,
) => {
    const wethAddrEncoded = abiCoder.encode(['address'], [WETH_ADDRESS]);
    const lusdAddrEncoded = abiCoder.encode(['address'], [LUSD_ADDR]);
    const targetRatioIncreaseEncoded = abiCoder.encode(['uint256'], [targetRatioIncrease.toString()]);
    const withdrawIdEncoded = abiCoder.encode(['uint8'], [1]); // withdraw - 1
    const paybackIdEncoded = abiCoder.encode(['uint8'], [0]); // payback - 0

    const triggerData = await createDebtInFrontWithLimitTrigger(proxy.address, debtInFront.toString());
    const strategySub = [strategyId, false, [triggerData], [
        wethAddrEncoded, lusdAddrEncoded, targetRatioIncreaseEncoded, withdrawIdEncoded, paybackIdEncoded]];

    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subLiqutityDsrSupplyStrategy = async ({
    proxy, strategyId, triggerRatio, targetRatio,
}) => {
    const ratioStateEncoded = abiCoder.encode(['uint8'], [IN_REPAY]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const daiAddressEncoded = abiCoder.encode(['address'], [DAI_ADDR]);
    const wethAddressEncoded = abiCoder.encode(['address'], [WETH_ADDRESS]);

    const triggerData = await createLiquityTrigger(proxy.address, triggerRatio, RATIO_STATE_UNDER);
    const strategySub = [strategyId, false, [triggerData], [ratioStateEncoded, targetRatioEncoded, daiAddressEncoded, wethAddressEncoded]];

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
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
) => {
    const priceTriggerData = defaultAbiCoder.encode(
        ['address', 'address', 'uint256', 'uint8'],
        [triggerBaseAsset, triggerQuoteAsset, targetPrice, priceState],
    );
    const gasPriceTriggerData = await createGasPriceTrigger(gasPrice);

    const strategySub = [bundleId, true, [priceTriggerData, gasPriceTriggerData], [
        defaultAbiCoder.encode(['address'], [collAsset]),
        defaultAbiCoder.encode(['uint16'], [collAssetId.toString()]),
        defaultAbiCoder.encode(['address'], [debtAsset]),
        defaultAbiCoder.encode(['uint16'], [debtAssetId.toString()]),
        defaultAbiCoder.encode(['address'], [nullAddress]), // needed so we dont have to trust injection
    ]];

    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

module.exports = {
    subDcaStrategy,
    subMcdRepayStrategy,
    subMcdBoostStrategy,
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
    subMorphoAaveV2BoostStrategy,
    subMorphoAaveV2RepayStrategy,
    subMorphoAaveV2AutomationStrategy,
    subLiquityAutomationStrategy,
    subAaveV2AutomationStrategy,
    subCompV2AutomationStrategy,
    subSparkAutomationStrategy,
    updateSparkAutomationStrategy,
    subSparkCloseBundle,
    subLiqutityDsrPaybackStrategy,
    subLiqutityDsrSupplyStrategy,
    subLiquityDebtInFrontRepayStrategy,
    subAaveV3CloseWithMaximumGasPriceBundle,
};
