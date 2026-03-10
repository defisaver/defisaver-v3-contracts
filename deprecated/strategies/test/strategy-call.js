const dfs = require('@defisaver/sdk');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    formatExchangeObj,
    getGasUsed,
    calcGasToUSD,
    AVG_GAS_PRICE,
    placeHolderAddr,
    WETH_ADDRESS,
    UNISWAP_WRAPPER,
    MAX_UINT128,
    nullAddress,
    formatMockExchangeObj,
    MAX_UINT,
} = require('../../utils/utils');

const { ADAPTER_ADDRESS } = require('../../utils/reflexer');
const abiCoder = new hre.ethers.utils.AbiCoder();

const callUniV3RangeOrderStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    liquidity,
    recipient,
    nftOwner,
) => {
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
    const strategyIndex = 0;
    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callUniV3RangeOrderStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callUniV3CollectStrategy = async (botAcc, strategyExecutor, subId, strategySub, nftOwner) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const collectAction = new dfs.actions.uniswapV3.UniswapV3CollectAction(
        '0',
        placeHolderAddr,
        MAX_UINT128,
        MAX_UINT128,
        nftOwner,
    );

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
    actionsCallData.push(collectAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    const strategyIndex = 0;
    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
            gasPrice: hre.ethers.utils.parseUnits('10', 'gwei'),
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callUniV3CollectStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callReflexerBoostStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    boostAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const reflexerGenerateAction = new dfs.actions.reflexer.ReflexerGenerateAction(
        '0', // safeId
        boostAmount,
        placeHolderAddr,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(getAssetInfo('RAI').address, WETH_ADDRESS, '0', UNISWAP_WRAPPER),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 800000; // 800k gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, WETH_ADDRESS, '0');

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
    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callReflexerBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callReflexerFLBoostStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    boostAmount,
    flAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const AAVE_NO_DEBT_MODE = 0;
    const flAction = new dfs.actions.flashloan.AaveV2FlashLoanAction(
        [getAssetInfo('RAI').address],
        [boostAmount],
        [AAVE_NO_DEBT_MODE],
        nullAddress,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(getAssetInfo('RAI').address, WETH_ADDRESS, '0', UNISWAP_WRAPPER),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 800000; // 800k gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, WETH_ADDRESS, '0');

    const reflexerSupplyAction = new dfs.actions.reflexer.ReflexerSupplyAction(
        '0', // safeId
        '0', // amount
        ADAPTER_ADDRESS,
        placeHolderAddr,
    );

    const reflexerGenerateAction = new dfs.actions.reflexer.ReflexerGenerateAction(
        '0', // safeId
        '0',
        flAddr,
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(reflexerSupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(reflexerGenerateAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);

    const strategyIndex = 1;
    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callReflexerFLBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callReflexerRepayStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    repayAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const reflexerWithdrawAction = new dfs.actions.reflexer.ReflexerWithdrawAction(
        '0', // safeId
        repayAmount,
        ADAPTER_ADDRESS,
        placeHolderAddr,
    );

    const repayGasCost = 800000; // 800k gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, WETH_ADDRESS, '0');

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(WETH_ADDRESS, getAssetInfo('RAI').address, '0', UNISWAP_WRAPPER),
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
    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callReflexerRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callReflexerFLRepayStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    repayAmount,
    flAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        [getAssetInfo('WETH').address],
        [repayAmount],
    );

    const repayGasCost = 800000; // 800k gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, WETH_ADDRESS, '0');

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(WETH_ADDRESS, getAssetInfo('RAI').address, '0', UNISWAP_WRAPPER),
        placeHolderAddr,
        placeHolderAddr,
    );

    const reflexerPaybackAction = new dfs.actions.reflexer.ReflexerPaybackAction(
        '0', // safeId
        '0',
        placeHolderAddr,
    );

    const reflexerWithdrawAction = new dfs.actions.reflexer.ReflexerWithdrawAction(
        '0', // safeId
        '0',
        ADAPTER_ADDRESS,
        flAddr,
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(reflexerPaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(reflexerWithdrawAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);

    const strategyIndex = 1;
    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callReflexerFLRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callCbRebondStrategy = async (botAcc, strategyExecutor, subId, strategySub) => {
    const actionsCallData = [];
    const cbChickenInAction = new dfs.actions.chickenBonds.CBChickenInAction(
        '0', // bondID hardcoded from sub slot
        placeHolderAddr, // _to hardcoded to proxy
    );

    const bLUSDInfo = getAssetInfo('bLUSD');
    const lusdInfo = getAssetInfo('LUSD');

    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(bLUSDInfo, lusdInfo, MAX_UINT),
        placeHolderAddr,
        placeHolderAddr,
    );

    const gasCost = 1_600_000;
    const gasFee = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, 0);

    const cbCreateAction = new dfs.actions.chickenBonds.CBCreateAction(
        '0', // lusdAmount from the gas fee action
        placeHolderAddr, // from hardcoded proxy
    );

    const cbUpdateRebondSubAction = new dfs.actions.chickenBonds.CBUpdateRebondSubAction(
        '0', // hardcoded subId from subscription
        '0', // hardcoded bondId from return value
    );

    actionsCallData.push(cbChickenInAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(gasFee.encodeForRecipe()[0]);
    actionsCallData.push(cbCreateAction.encodeForRecipe()[0]);
    actionsCallData.push(cbUpdateRebondSubAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    const strategyIndex = 0;
    const triggerCallData = [];

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callCbRebondStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callLiquityPaybackChickenOutStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    bondIdIfRebondSub,
    lusdDepositedInBond,
    upperHint,
    lowerHint,
) => {
    const actionsCallData = [];
    const fetchBondIdAction = new dfs.actions.chickenBonds.FetchBondIdAction(
        '0',
        '0',
        bondIdIfRebondSub,
    );
    const cbChickenOutAction = new dfs.actions.chickenBonds.CBChickenOutAction(
        '0',
        lusdDepositedInBond, // sent from backend to support emergency repayments, but should default to bond.lusdAmountDeposited almost always
        placeHolderAddr,
    );
    const gasCost = 1_000_000;
    const feeAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const paybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        hre.ethers.constants.MaxUint256,
        placeHolderAddr,
        upperHint,
        lowerHint,
    );
    const sendTokenAction = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );

    actionsCallData.push(fetchBondIdAction.encodeForRecipe()[0]);
    actionsCallData.push(cbChickenOutAction.encodeForRecipe()[0]);
    actionsCallData.push(feeAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    const strategyIndex = 1;
    const triggerCallData = [];

    triggerCallData.push(abiCoder.encode(['address', 'uint256', 'uint8'], [nullAddress, '0', '0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callLiquityPaybackChickenOutStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callLiquityPaybackChickenInStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    bondIdIfRebondSub,
    lusdDepositedInBond,
    upperHint,
    lowerHint,
) => {
    const actionsCallData = [];
    const fetchBondIdAction = new dfs.actions.chickenBonds.FetchBondIdAction(
        '0',
        '0',
        bondIdIfRebondSub,
    );
    const cbChickenOutAction = new dfs.actions.chickenBonds.CBChickenInAction(
        placeHolderAddr,
        placeHolderAddr,
    );
    const bLUSDInfo = getAssetInfo('bLUSD');
    const lusdInfo = getAssetInfo('LUSD');
    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(bLUSDInfo, lusdInfo, MAX_UINT),
        placeHolderAddr, // hardcoded
        placeHolderAddr, // hardcoded
    );
    const gasCost = 1_000_000;
    const feeAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const paybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        hre.ethers.constants.MaxUint256,
        placeHolderAddr,
        upperHint,
        lowerHint,
    );
    const sendTokenAction = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );

    actionsCallData.push(fetchBondIdAction.encodeForRecipe()[0]);
    actionsCallData.push(cbChickenOutAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    const strategyIndex = 0;
    const triggerCallData = [];

    triggerCallData.push(abiCoder.encode(['address', 'uint256', 'uint8'], [nullAddress, '0', '0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callLiquityPaybackChickenInStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMorphoAaveV2FLBoostStrategy = async ({
    botAcc,
    strategyExecutor,
    subId,
    strategyId,
    strategySub,

    cAsset,
    dAsset,
    flAddress,
    flAmount,
    exchangeAmount,
    exchangeWrapper,
}) => {
    const strategy = new dfs.Strategy('');

    strategy.addAction(
        new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.BalancerFlashLoanAction([dAsset], [flAmount], []),
        ),
    );
    strategy.addAction(
        new dfs.actions.basic.SellAction(
            formatExchangeObj(dAsset, cAsset, exchangeAmount, exchangeWrapper),
            placeHolderAddr,
            placeHolderAddr,
        ),
    );

    const gasCost = 2_300_000;
    strategy.addAction(new dfs.actions.basic.GasFeeAction(gasCost, cAsset, '0'));
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2SupplyAction(cAsset, '0', nullAddress, nullAddress, '0'),
    );
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2BorrowAction(dAsset, '0', flAddress, '0'),
    );
    strategy.addAction(
        new dfs.actions.checkers.MorphoAaveV2RatioCheckAction('0', '0', nullAddress),
    );

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];
    const actionsCallData = strategy.actions.map((e) => e.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyId,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callMorphoAaveV2FLBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMorphoAaveV2BoostStrategy = async ({
    botAcc,
    strategyExecutor,
    subId,
    strategyId,
    strategySub,

    cAsset,
    dAsset,
    boostAmount,
    exchangeWrapper,
}) => {
    const strategy = new dfs.Strategy('');

    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2BorrowAction(dAsset, boostAmount, nullAddress, '0'),
    );
    strategy.addAction(
        new dfs.actions.basic.SellAction(
            formatExchangeObj(dAsset, cAsset, '0', exchangeWrapper),
            placeHolderAddr,
            placeHolderAddr,
        ),
    );
    const gasCost = 2_000_000;
    strategy.addAction(new dfs.actions.basic.GasFeeAction(gasCost, cAsset, '0'));
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2SupplyAction(cAsset, '0', nullAddress, nullAddress, '0'),
    );
    strategy.addAction(
        new dfs.actions.checkers.MorphoAaveV2RatioCheckAction('0', '0', nullAddress),
    );

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];
    const actionsCallData = strategy.actions.map((e) => e.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyId,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callMorphoAaveV2BoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMorphoAaveV2FLRepayStrategy = async ({
    botAcc,
    strategyExecutor,
    subId,
    strategyId,
    strategySub,
    cAsset,
    dAsset,
    flAmount,
    flAddress,
    exchangeAmount,
    exchangeWrapper,
}) => {
    const strategy = new dfs.Strategy('');

    strategy.addAction(
        new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.BalancerFlashLoanAction([cAsset], [flAmount], []),
        ),
    );
    strategy.addAction(
        new dfs.actions.basic.SellAction(
            formatExchangeObj(cAsset, dAsset, exchangeAmount, exchangeWrapper),
            placeHolderAddr,
            placeHolderAddr,
        ),
    );

    const gasCost = 2_400_000;
    strategy.addAction(new dfs.actions.basic.GasFeeAction(gasCost, dAsset, '0'));
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2PaybackAction(dAsset, '0', nullAddress, nullAddress),
    );
    strategy.addAction(new dfs.actions.morpho.MorphoAaveV2WithdrawAction(cAsset, '0', flAddress));
    strategy.addAction(
        new dfs.actions.checkers.MorphoAaveV2RatioCheckAction('0', '0', nullAddress),
    );

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];
    const actionsCallData = strategy.actions.map((e) => e.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyId,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callMorphoAaveV2FLRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMorphoAaveV2RepayStrategy = async ({
    botAcc,
    strategyExecutor,
    subId,
    strategyId,
    strategySub,

    cAsset,
    dAsset,
    repayAmount,
    exchangeWrapper,
}) => {
    const strategy = new dfs.Strategy('');

    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2WithdrawAction(cAsset, repayAmount, nullAddress),
    );
    strategy.addAction(
        new dfs.actions.basic.SellAction(
            formatExchangeObj(cAsset, dAsset, '0', exchangeWrapper),
            placeHolderAddr,
            placeHolderAddr,
        ),
    );

    const gasCost = 0;
    strategy.addAction(new dfs.actions.basic.GasFeeAction(gasCost, dAsset, '0'));
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2PaybackAction(dAsset, '0', nullAddress, nullAddress),
    );
    strategy.addAction(
        new dfs.actions.checkers.MorphoAaveV2RatioCheckAction('0', '0', nullAddress),
    );

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];
    const actionsCallData = strategy.actions.map((e) => e.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyId,
        triggerCallData,
        actionsCallData,
        strategySub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callMorphoAaveV2RepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

module.exports = {
    callUniV3RangeOrderStrategy,
    callUniV3CollectStrategy,
    callReflexerBoostStrategy,
    callReflexerFLBoostStrategy,
    callReflexerRepayStrategy,
    callReflexerFLRepayStrategy,
    callCbRebondStrategy,
    callLiquityPaybackChickenOutStrategy,
    callLiquityPaybackChickenInStrategy,
    callMorphoAaveV2FLBoostStrategy,
    callMorphoAaveV2BoostStrategy,
    callMorphoAaveV2FLRepayStrategy,
    callMorphoAaveV2RepayStrategy,
};
