/* eslint-disable max-len */
const hre = require('hardhat');

const {
    subToStrategy,
    subToCompV3Proxy,
    subToCBRebondProxy,
} = require('./utils-strategies');

const {
    createUniV3RangeOrderTrigger,
    createMcdTrigger,
    createChainLinkPriceTrigger,
    createTimestampTrigger,
    createGasPriceTrigger,
    createCompTrigger,
    createReflexerTrigger,
    createLiquityTrigger,
    createTrailingStopTrigger,
    createCbRebondTrigger,
    createOffchainPriceTrigger,
    RATIO_STATE_UNDER,
    RATIO_STATE_OVER,
} = require('./triggers');

const {
    REGISTRY_ADDR,
    DAI_ADDR,
    WBTC_ADDR,
    WETH_ADDRESS,
    LUSD_ADDR,
    USDC_ADDR,
    BLUSD_ADDR,
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

const subCompBoostStrategy = async (proxy, ratioOver, targetRatio, strategyId) => {
    const isBundle = false;

    const proxyAddrEncoded = abiCoder.encode(['address'], [proxy.address]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const triggerData = await createCompTrigger(proxy.address, ratioOver, RATIO_STATE_OVER);

    const strategySub = [strategyId, isBundle, [triggerData], [proxyAddrEncoded, targetRatioEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subCompRepayStrategy = async (proxy, ratioUnder, targetRatio, strategyId) => {
    const isBundle = false;

    const proxyAddrEncoded = abiCoder.encode(['address'], [proxy.address]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const triggerData = await createCompTrigger(proxy.address, ratioUnder, RATIO_STATE_UNDER);

    const strategySub = [strategyId, isBundle, [triggerData], [proxyAddrEncoded, targetRatioEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

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
const subLimitOrderStrategy = async (proxy, tokenAddrSell, tokenAddrBuy, amount, targetPrice, goodUntil, strategyId) => {
    const isBundle = false;

    const tokenAddrSellEncoded = abiCoder.encode(['address'], [tokenAddrSell]);
    const tokenAddrBuyEncoded = abiCoder.encode(['address'], [tokenAddrBuy]);
    const amountEncoded = abiCoder.encode(['uint256'], [amount.toString()]);

    // eslint-disable-next-line max-len
    const triggerData = await createOffchainPriceTrigger(targetPrice, goodUntil);
    const strategySub = [strategyId, isBundle, [triggerData], [tokenAddrSellEncoded, tokenAddrBuyEncoded, amountEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

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

const subLiquityBoostStrategy = async (proxy, maxFeePercentage, ratioOver, targetRatio, bundleId) => {
    const isBundle = true;

    const maxFeePercentageEncoded = abiCoder.encode(['uint256'], [maxFeePercentage.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);

    const triggerData = await createLiquityTrigger(proxy.address, ratioOver, RATIO_STATE_OVER);
    const strategySub = [bundleId, isBundle, [triggerData], [maxFeePercentageEncoded, targetRatioEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subLiquityRepayStrategy = async (proxy, ratioUnder, targetRatio, bundleId) => {
    const isBundle = true;

    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const triggerData = await createLiquityTrigger(proxy.address, ratioUnder, RATIO_STATE_UNDER);

    const strategySub = [bundleId, isBundle, [triggerData], [targetRatioEncoded]];
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
    subCompBoostStrategy,
    subCompRepayStrategy,
    subReflexerBoostStrategy,
    subReflexerRepayStrategy,
    subLiquityBoostStrategy,
    subLiquityRepayStrategy,
    subLiquityCloseToCollStrategy,
    subLiquityTrailingCloseToCollStrategy,
    subMcdTrailingCloseToCollStrategy,
    subCompV3AutomationStrategy,
    subCbRebondStrategy,
    subLiquityCBPaybackStrategy,
};
