/* eslint-disable max-len */
const dfs = require('@defisaver/sdk');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    subToStrategy,
    getLatestStrategyId,
} = require('./utils-strategies');

const {
    createUniV3RangeOrderTrigger,
    createMcdTrigger,
    createChainLinkPriceTrigger,
    RATIO_STATE_UNDER,
    RATIO_STATE_OVER,
    createTimestampTrigger,
    createGasPriceTrigger,
    createCompTrigger,
    createReflexerTrigger,
} = require('./triggers');

const {
    formatExchangeObj,
    getGasUsed,
    calcGasToUSD,
    AVG_GAS_PRICE,
    placeHolderAddr,
    MCD_MANAGER_ADDR,
    WETH_ADDRESS,
    DAI_ADDR,
    UNISWAP_WRAPPER,
    MAX_UINT128,
    nullAddress,
} = require('./utils');
const { getNextEthPrice } = require('./utils-mcd');

const { ADAPTER_ADDRESS } = require('./utils-reflexer');

const abiCoder = new hre.ethers.utils.AbiCoder();

// eslint-disable-next-line max-len
const subUniContinuousCollectStrategy = async (proxy, tokenId, recipient, timestamp, maxGasPrice, interval) => {
    const tokenIdEncoded = abiCoder.encode(['uint256'], [tokenId.toString()]);
    const recipientEncoded = abiCoder.encode(['address'], [recipient]);
    const strategyId = await getLatestStrategyId();
    const timestampTriggerData = await createTimestampTrigger(timestamp, interval);
    const gasTriggerData = await createGasPriceTrigger(maxGasPrice);
    // eslint-disable-next-line max-len
    const subId = await subToStrategy(proxy, strategyId, true, [tokenIdEncoded, recipientEncoded], [timestampTriggerData, gasTriggerData]);

    return subId;
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
    const tokenAddrSellEncoded = abiCoder.encode(['address'], [tokenAddrSell]);
    const tokenAddrBuyEncoded = abiCoder.encode(['address'], [tokenAddrBuy]);
    const amountEncoded = abiCoder.encode(['uint256'], [amount]);
    const intervalEncoded = abiCoder.encode(['uint256'], [interval]);
    const lastTimestampEncoded = abiCoder.encode(['uint256'], [lastTimestamp]);
    const proxyEncoded = abiCoder.encode(['address'], [proxy.address]);
    const eoaEncoded = abiCoder.encode(['address'], [eoa]);

    const strategyId = await getLatestStrategyId();

    const timestampTriggerData = await createTimestampTrigger(lastTimestamp, interval);

    const subId = await subToStrategy(
        proxy,
        strategyId,
        true,
        [
            tokenAddrSellEncoded,
            tokenAddrBuyEncoded,
            amountEncoded,
            intervalEncoded,
            lastTimestampEncoded,
            proxyEncoded,
            eoaEncoded,
        ],
        [
            timestampTriggerData,
        ],
    );

    return subId;
};

const subUniV3RangeOrderStrategy = async (proxy, tokenId, state, recipient) => {
    const tokenIdEncoded = abiCoder.encode(['uint256'], [tokenId.toString()]);
    const recipientEncoded = abiCoder.encode(['address'], [recipient]);
    const strategyId = await getLatestStrategyId();
    const triggerData = await createUniV3RangeOrderTrigger(tokenId, state);

    // eslint-disable-next-line max-len
    const subId = await subToStrategy(proxy, strategyId, true, [tokenIdEncoded, recipientEncoded], [triggerData]);

    return subId;
};

const subMcdRepayStrategy = async (proxy, id, vaultId, rationUnder, targetRatio, isBundle) => {
    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);

    const triggerData = await createMcdTrigger(vaultId, rationUnder, RATIO_STATE_UNDER);

    const poolPacked = hre.ethers.utils.solidityPack(['uint64', 'uint64', 'bytes20'], [vaultId, rationUnder, proxy.address]);

    // eslint-disable-next-line max-len
    const subId = await subToStrategy(
        proxy,
        id,
        true,
        [
            vaultIdEncoded,
            targetRatioEncoded,
        ],
        [
            triggerData,
        ],
        poolPacked,
        isBundle,
    );

    return subId;
};
const subCompBoostStrategy = async (proxy, ratioOver, targetRatio) => {
    const proxyAddrEncoded = abiCoder.encode(['address'], [proxy.address]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const strategyId = await getLatestStrategyId();
    const triggerData = await createCompTrigger(proxy.address, ratioOver, RATIO_STATE_OVER);

    const subId = await subToStrategy(
        proxy, strategyId, true,
        [proxyAddrEncoded, targetRatioEncoded],
        [triggerData],
    );

    return subId;
};
const subCompRepayStrategy = async (proxy, ratioUnder, targetRatio) => {
    const proxyAddrEncoded = abiCoder.encode(['address'], [proxy.address]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const strategyId = await getLatestStrategyId();
    const triggerData = await createCompTrigger(proxy.address, ratioUnder, RATIO_STATE_UNDER);

    const subId = await subToStrategy(
        proxy, strategyId, true,
        [proxyAddrEncoded, targetRatioEncoded],
        [triggerData],
    );

    return subId;
};

const subMcdBoostStrategy = async (proxy, bundleId, vaultId, rationUnder, targetRatio, isBundle) => {
    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);

    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    // const strategyId = await getLatestStrategyId();

    const triggerData = await createMcdTrigger(vaultId, rationUnder, RATIO_STATE_OVER);
    // eslint-disable-next-line max-len
    const subId = await subToStrategy(proxy, bundleId, true, [vaultIdEncoded, targetRatioEncoded],
        [triggerData], isBundle);

    return subId;
};

const subMcdCloseStrategy = async (vaultId, proxy, recipient, targetPrice, tokenAddress) => {
    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const recipientEncoded = abiCoder.encode(['address'], [recipient]);

    const strategyId = await getLatestStrategyId();

    const triggerData = await createChainLinkPriceTrigger(
        tokenAddress, targetPrice, RATIO_STATE_OVER,
    );
    const subId = await subToStrategy(
        proxy, strategyId, true,
        [vaultIdEncoded, recipientEncoded],
        [triggerData],
    );
    return subId;
};

// eslint-disable-next-line max-len
const subLimitOrderStrategy = async (proxy, senderAcc, tokenAddrSell, tokenAddrBuy, amount, targetPrice) => {
    const tokenAddrSellEncoded = abiCoder.encode(['address'], [tokenAddrSell]);
    const tokenAddrBuyEncoded = abiCoder.encode(['address'], [tokenAddrBuy]);
    const amountEncoded = abiCoder.encode(['uint256'], [amount.toString()]);

    const strategyId = await getLatestStrategyId();
    // eslint-disable-next-line max-len
    const triggerData = await createChainLinkPriceTrigger(tokenAddrSell, targetPrice, RATIO_STATE_OVER);

    // eslint-disable-next-line max-len
    const subId = await subToStrategy(proxy, strategyId, true, [tokenAddrSellEncoded, tokenAddrBuyEncoded, amountEncoded],
        [triggerData]);

    return subId;
};

const subReflexerBoostStrategy = async (proxy, safeId, ratioOver, targetRatio) => {
    const safeIdEncoded = abiCoder.encode(['uint256'], [safeId.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const strategyId = await getLatestStrategyId();
    const triggerData = await createReflexerTrigger(safeId, ratioOver, RATIO_STATE_OVER);
    // eslint-disable-next-line max-len
    const subId = await subToStrategy(
        proxy,
        strategyId,
        true,
        [safeIdEncoded, targetRatioEncoded],
        [triggerData],
    );

    return subId;
};

const subReflexerRepayStrategy = async (proxy, safeId, ratioUnder, targetRatio) => {
    const safeIdEncoded = abiCoder.encode(['uint256'], [safeId.toString()]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);
    const strategyId = await getLatestStrategyId();
    const triggerData = await createReflexerTrigger(safeId, ratioUnder, RATIO_STATE_UNDER);
    // eslint-disable-next-line max-len
    const subId = await subToStrategy(
        proxy,
        strategyId,
        true,
        [safeIdEncoded, targetRatioEncoded],
        [triggerData],
    );

    return subId;
};

// eslint-disable-next-line max-len
const callDcaStrategy = async (botAcc, strategyExecutor, subId) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        placeHolderAddr, placeHolderAddr, placeHolderAddr,
    );

    const gasCost = 500_000;
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        gasCost, placeHolderAddr, '$1',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            WETH_ADDRESS, // TODO: Why we need to hardcode this, can't be passed as &
            DAI_ADDR,
            '$2',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    actionsCallData.push(pullTokenAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(subId, 0, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callDcaStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

// eslint-disable-next-line max-len
const callUniV3RangeOrderStrategy = async (botAcc, strategyExecutor, subId, liquidity, recipient, nftOwner) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const deadline = Date.now() + Date.now();
    const withdrawAction = new dfs.actions.uniswapV3.UniswapV3WithdrawAction(
        '0',
        liquidity,
        0,
        0,
        deadline,
        recipient,
        MAX_UINT128,
        MAX_UINT128,
        nftOwner,
    );
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(subId, 0, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callUniV3RangeOrderStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

// eslint-disable-next-line max-len
const callUniV3CollectStrategy = async (botAcc, strategyExecutor, subId, nftOwner) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const collectAction = new dfs.actions.uniswapV3.UniswapV3CollectAction(
        '0',
        placeHolderAddr,
        MAX_UINT128,
        MAX_UINT128,
        nftOwner,
    );
    // const timestampTriggerData = await createTimestampTrigger('0', '0');
    // const changeTriggerDataAction = new dfs.actions.basic.ChangeTriggerDataAction(
    //     subStorageAddr,
    //     subId,
    //     timestampTriggerData,
    //     0,
    // );
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
    actionsCallData.push(collectAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(subId, 0, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
        gasPrice: hre.ethers.utils.parseUnits('10', 'gwei'),
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callUniV3CollectStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

// eslint-disable-next-line max-len
const callMcdRepayStrategy = async (botAcc, strategyExecutor, strategyIndex, subId, ethJoin, repayAmount) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        '0',
        repayAmount,
        ethJoin,
        placeHolderAddr,
        MCD_MANAGER_ADDR,
    );

    const repayGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        repayGasCost, WETH_ADDRESS, '0',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            WETH_ADDRESS,
            DAI_ADDR,
            '0',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        '0', // vaultId
        '0', // amount
        placeHolderAddr, // proxy
        MCD_MANAGER_ADDR,
    );

    const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
        '0', // targetRatio
        '0', // vaultId
        '0', // nextPrice
    );

    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdPaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdRatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0'])); // next price

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(subId, strategyIndex, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callMcdRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

// eslint-disable-next-line max-len
const callFLMcdRepayStrategy = async (botAcc, strategyExecutor, strategyIndex, flAddr, subId, ethJoin, repayAmount) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const flAction = new dfs.actions.flashloan.DyDxFlashLoanAction(repayAmount, WETH_ADDRESS);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            WETH_ADDRESS,
            DAI_ADDR,
            '0',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const repayGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        repayGasCost, DAI_ADDR, '0',
    );

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        '0', // vaultId
        '0', // amount
        placeHolderAddr, // proxy
        MCD_MANAGER_ADDR,
    );

    const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        '0',
        repayAmount,
        ethJoin,
        flAddr,
        MCD_MANAGER_ADDR,
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdPaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);

    const nextPrice = await getNextEthPrice();

    console.log(nextPrice);

    triggerCallData.push(abiCoder.encode(['uint256'], [nextPrice])); // next price

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(subId, strategyIndex, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callFLMcdRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

const callCompRepayStrategy = async (botAcc, strategyExecutor, strategyId, repayAmount) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const compWithdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
        getAssetInfo('cETH').address,
        repayAmount,
        placeHolderAddr,
    );
    const repayGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        repayGasCost, WETH_ADDRESS, '0',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            WETH_ADDRESS,
            DAI_ADDR,
            '0',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );
    const paybackAction = new dfs.actions.compound.CompoundPaybackAction(
        getAssetInfo('cDAI').address,
        '1',
        placeHolderAddr,
    );

    actionsCallData.push(compWithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(strategyId, 0, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callCompRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

const callCompBoostStrategy = async (botAcc, strategyExecutor, strategyId, boostAmount) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const compBorrowAction = new dfs.actions.compound.CompoundBorrowAction(
        getAssetInfo('cDAI').address,
        boostAmount,
        placeHolderAddr,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            DAI_ADDR,
            WETH_ADDRESS,
            '0',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );
    const boostGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        boostGasCost, WETH_ADDRESS, '0',
    );
    const compSupplyAction = new dfs.actions.compound.CompoundSupplyAction(
        getAssetInfo('cETH').address,
        '$2',
        placeHolderAddr,
        true,
    );
    actionsCallData.push(compBorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(compSupplyAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(strategyId, 0, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callCompBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

// eslint-disable-next-line max-len
const callMcdBoostStrategy = async (botAcc, strategyExecutor, strategyIndex, subId, ethJoin, boostAmount) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const generateAction = new dfs.actions.maker.MakerGenerateAction(
        '0',
        boostAmount,
        placeHolderAddr,
        MCD_MANAGER_ADDR,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            DAI_ADDR,
            WETH_ADDRESS,
            '0',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        boostGasCost, WETH_ADDRESS, '0',
    );

    const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
        '0', // vaultId
        '0', // amount
        ethJoin,
        placeHolderAddr, // proxy
        MCD_MANAGER_ADDR,
    );

    const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
        '0', // targetRatio
        '0', // vaultId
        '0', // nextPrice
    );

    actionsCallData.push(generateAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdSupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdRatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(subId, strategyIndex, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callMcdBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

// eslint-disable-next-line max-len
const callFLMcdBoostStrategy = async (botAcc, strategyExecutor, strategyIndex, flLoanAddr, subId, ethJoin, boostAmount) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const flAction = new dfs.actions.flashloan.DyDxFlashLoanAction(boostAmount, DAI_ADDR);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            DAI_ADDR,
            WETH_ADDRESS,
            '0',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        boostGasCost, WETH_ADDRESS, '0',
    );

    const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
        '0', // vaultId
        '0', // amount
        ethJoin,
        placeHolderAddr, // proxy
        MCD_MANAGER_ADDR,
    );

    const generateAction = new dfs.actions.maker.MakerGenerateAction(
        '0', // vaultId
        '0', // amount
        flLoanAddr,
        MCD_MANAGER_ADDR,
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdSupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(generateAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(subId, strategyIndex, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callFLMcdBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

const callLimitOrderStrategy = async (botAcc, senderAcc, strategyExecutor, subId) => {
    const actionsCallData = [];

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        WETH_ADDRESS, placeHolderAddr, '0',
    );

    const txGasCost = 500000; // 500k gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        txGasCost, WETH_ADDRESS, '0',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            WETH_ADDRESS, // can't be placeholder because of proper formatting of uni path
            DAI_ADDR,
            '0',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    actionsCallData.push(pullTokenAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(subId, 0, [[]], actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callLimitOrderStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

// eslint-disable-next-line max-len
const callMcdCloseStrategy = async (proxy, botAcc, strategyExecutor, subId, flAmount, ethJoin, dydxFlAddr) => {
    const actionsCallData = [];
    const flashLoanAction = new dfs.actions.flashloan.DyDxFlashLoanAction(
        flAmount,
        DAI_ADDR,
        nullAddress,
        [],
    );
    const paybackAction = new dfs.actions.maker.MakerPaybackAction(
        '0',
        hre.ethers.constants.MaxUint256,
        placeHolderAddr,
        MCD_MANAGER_ADDR,
    );
    const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        '0',
        hre.ethers.constants.MaxUint256,
        ethJoin,
        placeHolderAddr,
        MCD_MANAGER_ADDR,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            WETH_ADDRESS, // can't be placeholder because of proper formatting of uni path
            DAI_ADDR,
            hre.ethers.constants.MaxUint256,
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );
    const sendFirst = new dfs.actions.basic.SendTokenAction(
        DAI_ADDR,
        dydxFlAddr,
        flAmount,
    );
    const sendSecond = new dfs.actions.basic.SendTokenAction(
        DAI_ADDR,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );
    actionsCallData.push(flashLoanAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(sendFirst.encodeForRecipe()[0]);
    actionsCallData.push(sendSecond.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(subId, 0, [[]], actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callMcdCloseStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

const callReflexerBoostStrategy = async (botAcc, strategyExecutor, subId, boostAmount) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const reflexerGenerateAction = new dfs.actions.reflexer.ReflexerGenerateAction(
        '0', // safeId
        boostAmount,
        placeHolderAddr,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            getAssetInfo('RAI').address,
            WETH_ADDRESS,
            '0',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 800000; // 800k gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        boostGasCost, WETH_ADDRESS, '0',
    );

    const reflexerSupplyAction = new dfs.actions.reflexer.ReflexerSupplyAction(
        '0', // safeId
        '0', // amount
        ADAPTER_ADDRESS,
        placeHolderAddr,
    );

    actionsCallData.push(reflexerGenerateAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(reflexerSupplyAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);

    const strategyIndex = 0;
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(subId, strategyIndex, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callReflexerBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

const callReflexerRepayStrategy = async (botAcc, strategyExecutor, subId, repayAmount) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const reflexerWithdrawAction = new dfs.actions.reflexer.ReflexerWithdrawAction(
        '0', // safeId
        repayAmount,
        ADAPTER_ADDRESS,
        placeHolderAddr,
    );

    const repayGasCost = 800000; // 800k gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        repayGasCost, WETH_ADDRESS, '0',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            WETH_ADDRESS,
            getAssetInfo('RAI').address,
            '0',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const reflexerPaybackAction = new dfs.actions.reflexer.ReflexerPaybackAction(
        '0', // safeId
        '0',
        placeHolderAddr,
    );

    actionsCallData.push(reflexerWithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(reflexerPaybackAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);

    const strategyIndex = 0;
    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(subId, strategyIndex, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(`GasUsed callReflexerRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`);
};

module.exports = {
    subDcaStrategy,
    callDcaStrategy,
    subMcdRepayStrategy,
    subMcdBoostStrategy,
    subLimitOrderStrategy,
    callMcdRepayStrategy,
    callFLMcdRepayStrategy,
    callMcdBoostStrategy,
    callFLMcdBoostStrategy,
    callLimitOrderStrategy,
    subUniV3RangeOrderStrategy,
    callUniV3RangeOrderStrategy,
    subMcdCloseStrategy,
    callMcdCloseStrategy,
    subUniContinuousCollectStrategy,
    callUniV3CollectStrategy,
    subCompBoostStrategy,
    callCompBoostStrategy,
    subCompRepayStrategy,
    callCompRepayStrategy,
    subReflexerBoostStrategy,
    callReflexerBoostStrategy,
    subReflexerRepayStrategy,
    callReflexerRepayStrategy,
};
