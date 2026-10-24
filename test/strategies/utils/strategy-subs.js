/* eslint-disable no-unused-vars */
const hre = require('hardhat');
const automationSdk = require('@defisaver/automation-sdk');
const { getAssetInfo, getAssetInfoByAddress } = require('@defisaver/tokens');

const { subToStrategy } = require('./utils-strategies');

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
    AAVE_V2_MARKET_ADDR,
    addrs,
    chainIds,
    BOLD_ADDR,
    network,
} = require('../../utils/utils');
const { COMP_V3_MARKETS } = require('../../utils/compoundV3');

const abiCoder = new hre.ethers.utils.AbiCoder();

const bundleIdsByNetwork = {
    mainnet: automationSdk.enums.Bundles.MainnetIds,
    optimism: automationSdk.enums.Bundles.OptimismIds,
    arbitrum: automationSdk.enums.Bundles.ArbitrumIds,
    base: automationSdk.enums.Bundles.BaseIds,
};

const getBundleIds = () => bundleIdsByNetwork[network];

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

const subLiquityCloseToCollStrategy = async (proxy, targetPrice, tokenState, strategyId) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.closeOnPrice(
        tokenState === 1
            ? automationSdk.enums.RatioState.UNDER
            : automationSdk.enums.RatioState.OVER,
        targetPrice,
        WETH_ADDRESS,
        WETH_ADDRESS,
        chainIds[network],
    );
    if (strategyId !== undefined) strategySub[0] = strategyId;
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subLiquityTrailingCloseToCollStrategy = async (proxy, percentage, roundId, strategyId) => {
    const strategySub = automationSdk.strategySubService.liquityEncode.trailingStop(
        percentage,
        WETH_ADDRESS,
        WETH_ADDRESS,
        roundId,
        chainIds[network],
    );
    if (strategyId !== undefined) strategySub[0] = strategyId;
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
    const sellToken = getAssetInfoByAddress(tokenAddrSell, chainIds[network]);
    const buyToken = getAssetInfoByAddress(tokenAddrBuy, chainIds[network]);
    const latestBlock = await hre.ethers.provider.getBlock('latest');
    const targetPriceDecimals = buyToken.decimals + 18 - sellToken.decimals;
    const normalizedTargetPrice = hre.ethers.utils.formatUnits(targetPrice, targetPriceDecimals);
    const strategySub = automationSdk.strategySubService.exchangeEncode.limitOrder(
        tokenAddrSell,
        tokenAddrBuy,
        amount.toString(),
        normalizedTargetPrice,
        latestBlock.timestamp + goodUntilDuration,
        orderType,
        sellToken.decimals,
        buyToken.decimals,
        chainIds[network],
    );
    const subId = await subToStrategy(proxy, strategySub);

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
    const { AAVE_V2_REPAY, AAVE_V2_BOOST } = getBundleIds();
    const encoder = automationSdk.strategySubService.aaveV2Encode;
    const repaySub = encoder.leverageManagement(
        AAVE_V2_REPAY,
        AAVE_V2_MARKET_ADDR,
        proxy.address,
        automationSdk.enums.RatioState.UNDER,
        optimalRatioRepay,
        minRatio,
    );
    const repaySubId = await subToStrategy(proxy, repaySub);
    let boostSubId = '0';
    let boostSub;
    if (boostEnabled) {
        boostSub = encoder.leverageManagement(
            AAVE_V2_BOOST,
            AAVE_V2_MARKET_ADDR,
            proxy.address,
            automationSdk.enums.RatioState.OVER,
            optimalRatioBoost,
            maxRatio,
        );
        boostSubId = await subToStrategy(proxy, boostSub);
    }

    return {
        repaySubId,
        boostSubId,
        repaySub,
        boostSub,
    };
};

const subAaveV3AutomationStrategy = async (
    proxy,
    minRatio,
    maxRatio,
    optimalRatioBoost,
    optimalRatioRepay,
    boostEnabled,
) => {
    const { AAVE_V3_REPAY, AAVE_V3_BOOST } = getBundleIds();
    const encoder = automationSdk.strategySubService.aaveV3Encode;
    const repaySub = encoder.leverageManagement(
        AAVE_V3_REPAY,
        addrs[network].AAVE_MARKET,
        proxy.address,
        automationSdk.enums.RatioState.UNDER,
        optimalRatioRepay,
        minRatio,
    );
    const repaySubId = await subToStrategy(proxy, repaySub);
    let boostSubId = '0';
    let boostSub;
    if (boostEnabled) {
        boostSub = encoder.leverageManagement(
            AAVE_V3_BOOST,
            addrs[network].AAVE_MARKET,
            proxy.address,
            automationSdk.enums.RatioState.OVER,
            optimalRatioBoost,
            maxRatio,
        );
        boostSubId = await subToStrategy(proxy, boostSub);
    }

    return {
        repaySubId,
        boostSubId,
        repaySub,
        boostSub,
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

    const strategySub = encoder.leverageManagement(
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
    const { COMP_V2_REPAY, COMP_V2_BOOST } = getBundleIds();
    const encoder = automationSdk.strategySubService.compoundV2Encode;
    const repaySub = encoder.leverageManagement(
        COMP_V2_REPAY,
        proxy.address,
        automationSdk.enums.RatioState.UNDER,
        optimalRatioRepay,
        minRatio,
    );
    const repaySubId = await subToStrategy(proxy, repaySub);
    let boostSubId = '0';
    let boostSub;
    if (boostEnabled) {
        boostSub = encoder.leverageManagement(
            COMP_V2_BOOST,
            proxy.address,
            automationSdk.enums.RatioState.OVER,
            optimalRatioBoost,
            maxRatio,
        );
        boostSubId = await subToStrategy(proxy, boostSub);
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
) => {
    const { LIQUITY_REPAY, LIQUITY_BOOST } = getBundleIds();
    const encoder = automationSdk.strategySubService.liquityEncode;
    const repaySub = encoder.leverageManagement(
        LIQUITY_REPAY,
        proxy.address,
        automationSdk.enums.RatioState.UNDER,
        optimalRatioRepay,
        minRatio,
    );
    const repaySubId = await subToStrategy(proxy, repaySub);
    let boostSubId = '0';
    let boostSub;
    if (boostEnabled) {
        boostSub = encoder.leverageManagement(
            LIQUITY_BOOST,
            proxy.address,
            automationSdk.enums.RatioState.OVER,
            optimalRatioBoost,
            maxRatio,
        );
        boostSubId = await subToStrategy(proxy, boostSub);
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
    const { SPARK_REPAY, SPARK_BOOST } = getBundleIds();
    const encoder = automationSdk.strategySubService.sparkEncode;
    const repaySub = encoder.leverageManagement(
        SPARK_REPAY,
        addrs[network].SPARK_MARKET,
        proxy.address,
        automationSdk.enums.RatioState.UNDER,
        optimalRatioRepay,
        minRatio,
    );
    const repaySubId = await subToStrategy(proxy, repaySub);
    let boostSubId = '0';
    let boostSub;
    if (boostEnabled) {
        boostSub = encoder.leverageManagement(
            SPARK_BOOST,
            addrs[network].SPARK_MARKET,
            proxy.address,
            automationSdk.enums.RatioState.OVER,
            optimalRatioBoost,
            maxRatio,
        );
        boostSubId = await subToStrategy(proxy, boostSub);
    }

    console.log('Subs: ', repaySubId, boostSubId);

    return {
        firstSub: repaySubId,
        secondSub: boostSubId,
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
const subAaveV3GenericFLCollateralSwitchStrategy = async (
    proxy,
    strategyId,
    fromAsset,
    fromAssetId,
    toAsset,
    toAssetId,
    marketAddr,
    amountToSwitch,
    user,
    baseTokenAddress,
    quoteTokenAddress,
    triggerPrice,
    priceState,
) => {
    const strategySub = automationSdk.strategySubService.aaveV3Encode.collateralSwitchGeneric(
        strategyId,
        fromAsset,
        fromAssetId,
        toAsset,
        toAssetId,
        marketAddr,
        amountToSwitch,
        user,
        baseTokenAddress,
        quoteTokenAddress,
        triggerPrice,
        priceState,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};
const subAaveV3GenericFLDebtSwitchStrategy = async (
    proxy,
    strategyId,
    fromAsset,
    fromAssetId,
    toAsset,
    toAssetId,
    marketAddr,
    amountToSwitch,
    user,
    baseTokenAddress,
    quoteTokenAddress,
    triggerPrice,
    priceState,
) => {
    const strategySub = automationSdk.strategySubService.aaveV3Encode.debtSwitch(
        strategyId,
        fromAsset,
        fromAssetId,
        toAsset,
        toAssetId,
        marketAddr,
        amountToSwitch,
        user,
        baseTokenAddress,
        quoteTokenAddress,
        triggerPrice,
        priceState,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};
const subSparkFLCollateralSwitchStrategy = async (
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
    const strategySub = automationSdk.strategySubService.sparkEncode.collateralSwitch(
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
const subSparkGenericFLCollateralSwitchStrategy = async (
    proxy,
    strategyId,
    fromAsset,
    fromAssetId,
    toAsset,
    toAssetId,
    marketAddr,
    amountToSwitch,
    user,
    baseTokenAddress,
    quoteTokenAddress,
    triggerPrice,
    priceState,
) => {
    const strategySub = automationSdk.strategySubService.sparkEncode.collateralSwitchGeneric(
        strategyId,
        fromAsset,
        fromAssetId,
        toAsset,
        toAssetId,
        marketAddr,
        amountToSwitch,
        user,
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

const subCompV3LeverageManagement = async (
    proxy,
    marketSymbol,
    triggerRepayRatio,
    triggerBoostRatio,
    targetRatioBoost,
    targetRatioRepay,
    boostEnabled,
    isEOA,
    eoaAddress,
) => {
    const marketAddr = COMP_V3_MARKETS[chainIds[network]][marketSymbol];
    const debtAsset = getAssetInfo(
        marketSymbol === 'ETH' ? 'WETH' : marketSymbol,
        chainIds[network],
    );

    const bundleIds = getBundleIds();
    const repayBundleId =
        network === 'mainnet'
            ? bundleIds[isEOA ? 'COMP_V3_EOA_REPAY_V2_BUNDLE' : 'COMP_V3_SW_REPAY_V2_BUNDLE']
            : bundleIds[isEOA ? 'COMP_V3_EOA_REPAY' : 'COMP_V3_SW_REPAY_BUNDLE'];
    const boostBundleId =
        network === 'mainnet'
            ? bundleIds[isEOA ? 'COMP_V3_EOA_BOOST_V2_BUNDLE' : 'COMP_V3_SW_BOOST_V2_BUNDLE']
            : bundleIds[isEOA ? 'COMP_V3_EOA_BOOST' : 'COMP_V3_SW_BOOST_BUNDLE'];
    const user = isEOA ? eoaAddress : proxy.address;
    const encoder = automationSdk.strategySubService.compoundV3Encode;
    const repaySub = encoder.leverageManagement(
        repayBundleId,
        marketAddr,
        debtAsset.address,
        user,
        automationSdk.enums.RatioState.UNDER,
        targetRatioRepay,
        triggerRepayRatio,
    );
    const repaySubId = await subToStrategy(proxy, repaySub);
    let boostSubId = '0';
    let boostSub;
    if (boostEnabled) {
        boostSub = encoder.leverageManagement(
            boostBundleId,
            marketAddr,
            debtAsset.address,
            user,
            automationSdk.enums.RatioState.OVER,
            targetRatioBoost,
            triggerBoostRatio,
        );
        boostSubId = await subToStrategy(proxy, boostSub);
    }

    return { repaySubId, boostSubId, repaySub, boostSub };
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

const subSparkLeverageManagementOnPriceGeneric = async (
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
        automationSdk.strategySubService.sparkEncode.leverageManagementOnPriceGeneric(
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

const subAaveV4LeverageManagement = async (
    bundleId,
    proxy,
    owner,
    spoke,
    ratioState,
    targetRatio,
    triggerRatio,
) => {
    const strategySub = automationSdk.strategySubService.aaveV4Encode.leverageManagement(
        bundleId,
        owner,
        spoke,
        ratioState,
        targetRatio,
        triggerRatio,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subAaveV4LeverageManagementOnPrice = async (
    bundleId,
    proxy,
    owner,
    spoke,
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
    targetRatio,
    price,
    priceState,
    ratioState,
) => {
    const strategySub = automationSdk.strategySubService.aaveV4Encode.leverageManagementOnPrice(
        bundleId,
        owner,
        spoke,
        collAsset,
        collAssetId,
        debtAsset,
        debtAssetId,
        targetRatio,
        price,
        priceState,
        ratioState,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subAaveV4CloseOnPrice = async (
    bundleId,
    proxy,
    owner,
    spoke,
    collAsset,
    collAssetId,
    debtAsset,
    debtAssetId,
    stopLossPrice,
    stopLossType,
    takeProfitPrice,
    takeProfitType,
) => {
    const strategySub = automationSdk.strategySubService.aaveV4Encode.closeOnPrice(
        bundleId,
        owner,
        spoke,
        collAsset,
        collAssetId,
        debtAsset,
        debtAssetId,
        stopLossPrice,
        stopLossType,
        takeProfitPrice,
        takeProfitType,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

const subAaveV4FLCollateralSwitchStrategy = async (
    strategyId,
    proxy,
    owner,
    spoke,
    fromAsset,
    fromAssetId,
    toAsset,
    toAssetId,
    amountToSwitch,
    price,
    ratioState,
) => {
    const strategySub = automationSdk.strategySubService.aaveV4Encode.collateralSwitch(
        strategyId,
        owner,
        spoke,
        fromAsset,
        fromAssetId,
        toAsset,
        toAssetId,
        amountToSwitch,
        price,
        ratioState,
    );
    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};
const subSparkLeverageManagementGeneric = async (
    bundleId,
    proxy,
    eoaAddr,
    marketAddr,
    ratioState,
    targetRatio,
    triggerRatio,
    isEOA,
) => {
    const encoder = automationSdk.strategySubService.sparkEncode;

    const user = isEOA ? eoaAddr : proxy.address;

    const strategySub = encoder.leverageManagementGeneric(
        bundleId, // strategyOrBundleId
        marketAddr,
        user, // user - EOA / SW, depending if it is EOA strategy
        ratioState, // ratioState -> 0 for boost, 1 for repay
        targetRatio,
        triggerRatio,
    );

    const subId = await subToStrategy(proxy, strategySub);
    return { subId, strategySub };
};

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
    subAaveV3GenericFLCollateralSwitchStrategy,
    subAaveV3GenericFLDebtSwitchStrategy,
    subSparkCloseGeneric,
    subMorphoBlueClose,
    subSparkRepayOnPriceBundle,
    subSparkBoostOnPriceBundle,
    subAaveV4LeverageManagement,
    subAaveV4LeverageManagementOnPrice,
    subAaveV4CloseOnPrice,
    subAaveV4FLCollateralSwitchStrategy,
    subSparkFLCollateralSwitchStrategy,
    subSparkGenericFLCollateralSwitchStrategy,
    subSparkLeverageManagementGeneric,
    subSparkLeverageManagementOnPriceGeneric,
};
