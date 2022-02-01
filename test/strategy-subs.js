/* eslint-disable max-len */
const hre = require('hardhat');

const {
    subToStrategy,
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
    RATIO_STATE_UNDER,
    RATIO_STATE_OVER,
} = require('./triggers');
const { REGISTRY_ADDR, DAI_ADDR } = require('./utils');
const { MCD_MANAGER_ADDR } = require('./utils-mcd');

const abiCoder = new hre.ethers.utils.AbiCoder();

// eslint-disable-next-line max-len
const subUniContinuousCollectStrategy = async (proxy, tokenId, recipient, timestamp, maxGasPrice, interval) => {
    const bundleId = 0;
    const isBundle = false;

    const tokenIdEncoded = abiCoder.encode(['uint256'], [tokenId.toString()]);
    const recipientEncoded = abiCoder.encode(['address'], [recipient]);

    const timestampTriggerData = await createTimestampTrigger(timestamp, interval);
    const gasTriggerData = await createGasPriceTrigger(maxGasPrice);
    const strategySub = [bundleId, isBundle, [timestampTriggerData, gasTriggerData], [tokenIdEncoded, recipientEncoded]];
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
    eoa,
) => {
    const bundleId = 0;
    const isBundle = false;

    const tokenAddrSellEncoded = abiCoder.encode(['address'], [tokenAddrSell]);
    const tokenAddrBuyEncoded = abiCoder.encode(['address'], [tokenAddrBuy]);
    const amountEncoded = abiCoder.encode(['uint256'], [amount]);
    const intervalEncoded = abiCoder.encode(['uint256'], [interval]);
    const lastTimestampEncoded = abiCoder.encode(['uint256'], [lastTimestamp]);
    const proxyEncoded = abiCoder.encode(['address'], [proxy.address]);
    const eoaEncoded = abiCoder.encode(['address'], [eoa]);

    const triggerData = await createTimestampTrigger(lastTimestamp, interval);

    const strategySub = [
        bundleId,
        isBundle,
        [triggerData],
        [
            tokenAddrSellEncoded,
            tokenAddrBuyEncoded,
            amountEncoded,
            intervalEncoded,
            lastTimestampEncoded,
            proxyEncoded,
            eoaEncoded,
        ],
    ];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subUniV3RangeOrderStrategy = async (proxy, tokenId, state, recipient) => {
    const bundleId = 0;
    const isBundle = false;

    const tokenIdEncoded = abiCoder.encode(['uint256'], [tokenId.toString()]);
    const recipientEncoded = abiCoder.encode(['address'], [recipient]);

    const triggerData = await createUniV3RangeOrderTrigger(tokenId, state);
    const strategySub = [bundleId, isBundle, [triggerData], [tokenIdEncoded, recipientEncoded]];
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

const subCompBoostStrategy = async (proxy, ratioOver, targetRatio) => {
    const bundleId = 0;
    const isBundle = false;

    const proxyAddrEncoded = abiCoder.encode(['address'], [proxy.address]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const triggerData = await createCompTrigger(proxy.address, ratioOver, RATIO_STATE_OVER);

    const strategySub = [bundleId, isBundle, [triggerData], [proxyAddrEncoded, targetRatioEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subCompRepayStrategy = async (proxy, ratioUnder, targetRatio) => {
    const bundleId = 0;
    const isBundle = false;

    const proxyAddrEncoded = abiCoder.encode(['address'], [proxy.address]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const triggerData = await createCompTrigger(proxy.address, ratioUnder, RATIO_STATE_UNDER);

    const strategySub = [bundleId, isBundle, [triggerData], [proxyAddrEncoded, targetRatioEncoded]];
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

const subMcdCloseStrategy = async (vaultId, proxy, recipient, targetPrice, tokenAddress) => {
    const bundleId = 0;
    const isBundle = false;

    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const recipientEncoded = abiCoder.encode(['address'], [recipient]);

    const triggerData = await createChainLinkPriceTrigger(
        tokenAddress, targetPrice, RATIO_STATE_OVER,
    );
    const strategySub = [bundleId, isBundle, [triggerData], [vaultIdEncoded, recipientEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

// eslint-disable-next-line max-len
const subLimitOrderStrategy = async (proxy, senderAcc, tokenAddrSell, tokenAddrBuy, amount, targetPrice) => {
    const bundleId = 0;
    const isBundle = false;

    const tokenAddrSellEncoded = abiCoder.encode(['address'], [tokenAddrSell]);
    const tokenAddrBuyEncoded = abiCoder.encode(['address'], [tokenAddrBuy]);
    const amountEncoded = abiCoder.encode(['uint256'], [amount.toString()]);

    // eslint-disable-next-line max-len
    const triggerData = await createChainLinkPriceTrigger(tokenAddrSell, targetPrice, RATIO_STATE_OVER);
    const strategySub = [bundleId, isBundle, [triggerData], [tokenAddrSellEncoded, tokenAddrBuyEncoded, amountEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subReflexerBoostStrategy = async (proxy, safeId, ratioOver, targetRatio) => {
    const bundleId = 0;
    const isBundle = true;

    const safeIdEncoded = abiCoder.encode(['uint256'], [safeId.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);

    const triggerData = await createReflexerTrigger(safeId, ratioOver, RATIO_STATE_OVER);
    const strategySub = [bundleId, isBundle, [triggerData], [safeIdEncoded, targetRatioEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subReflexerRepayStrategy = async (proxy, safeId, ratioUnder, targetRatio) => {
    const bundleId = 0;
    const isBundle = true;

    const safeIdEncoded = abiCoder.encode(['uint256'], [safeId.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);

    const triggerData = await createReflexerTrigger(safeId, ratioUnder, RATIO_STATE_UNDER);
    const strategySub = [bundleId, isBundle, [triggerData], [safeIdEncoded, targetRatioEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subLiquityBoostStrategy = async (proxy, maxFeePercentage, ratioOver, targetRatio) => {
    const bundleId = 0;
    const isBundle = true;

    const maxFeePercentageEncoded = abiCoder.encode(['uint256'], [maxFeePercentage.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);

    const triggerData = await createLiquityTrigger(proxy.address, ratioOver, RATIO_STATE_OVER);
    const strategySub = [bundleId, isBundle, [triggerData], [maxFeePercentageEncoded, targetRatioEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

const subLiquityRepayStrategy = async (proxy, ratioUnder, targetRatio) => {
    const bundleId = 0;
    const isBundle = true;

    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const triggerData = await createLiquityTrigger(proxy.address, ratioUnder, RATIO_STATE_UNDER);

    const strategySub = [bundleId, isBundle, [triggerData], [targetRatioEncoded]];
    const subId = await subToStrategy(proxy, strategySub);

    return { subId, strategySub };
};

module.exports = {
    subDcaStrategy,
    subMcdRepayStrategy,
    subRepayFromSavingsStrategy,
    subMcdBoostStrategy,
    subLimitOrderStrategy,
    subUniV3RangeOrderStrategy,
    subMcdCloseStrategy,
    subUniContinuousCollectStrategy,
    subCompBoostStrategy,
    subCompRepayStrategy,
    subReflexerBoostStrategy,
    subReflexerRepayStrategy,
    subLiquityBoostStrategy,
    subLiquityRepayStrategy,
};
