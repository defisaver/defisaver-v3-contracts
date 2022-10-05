const dfs = require('@defisaver/sdk');
const { MAXUINT } = require('@defisaver/tokens');
const hre = require('hardhat');

const {
    formatExchangeObj,
    getGasUsed,
    calcGasToUSD,
    placeHolderAddr,
    nullAddress,
    addrs,
    network,
    formatMockExchangeObj,
} = require('./utils');

const abiCoder = new hre.ethers.utils.AbiCoder();

const AAVE_NO_DEBT_MODE = 0;

const callAaveV3RepayL2Strategy = async (
    botAcc,
    strategyExecutor,
    subId,
    ethAssetId,
    daiAssetId,
    collAssetAddr,
    debtAssetAddr,
    repayAmount,
    strategyIndex,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        ethAssetId,
        true, // useDefaultMarket
        repayAmount.toString(),
        placeHolderAddr,
        placeHolderAddr, // market
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            collAssetAddr,
            debtAssetAddr,
            '0',
            addrs[network].UNISWAP_WRAPPER,
            0,
            3000,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const repayGasCost = 1_000_000; // 1 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        repayGasCost,
        debtAssetAddr,
        '0',
        '0',
        '10000000',
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        true,
        placeHolderAddr, // market
        0, // amount
        placeHolderAddr, // proxy
        2, // rateMode
        debtAssetAddr, // debtAddr
        daiAssetId,
        false, // useOnBehalf
        placeHolderAddr, // onBehalf
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        0, // checkBoostState
        0, // 0
    );

    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const callData = strategyExecutorByBot.interface.encodeFunctionData('executeStrategy', [
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
    ]);

    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(repayGasCost, 0, callData);

    console.log(
        `GasUsed callAaveV3RepayL2Strategy: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice} and ${addrs[network].AVG_GAS_PRICE} gwei on L2`,
    );
};

const callAaveFLV3RepayL2Strategy = async (
    botAcc,
    strategyExecutor,
    subId,
    collAssetId,
    collAssetAddr,
    debtAssetAddr,
    daiAssetId,
    repayAmount,
    flAddr,
    strategyIndex,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const flAction = new dfs.actions.flashloan.AaveV3FlashLoanAction(
        [repayAmount],
        [collAssetAddr],
        [AAVE_NO_DEBT_MODE],
        nullAddress,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            collAssetAddr,
            debtAssetAddr,
            repayAmount,
            addrs[network].UNISWAP_WRAPPER,
            0,
            3000,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const repayGasCost = 1_330_000; // 1.33 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        repayGasCost,
        debtAssetAddr,
        '0',
        '0',
        '10000000',
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        true,
        placeHolderAddr, // market
        0, // amount
        placeHolderAddr, // proxy
        2, // rateMode
        debtAssetAddr, // debtAddr
        daiAssetId,
        false, // useOnBehalf
        placeHolderAddr, // onBehalf
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        collAssetId,
        true, // useDefaultMarket
        0, // fl amount
        flAddr, // flAddr
        placeHolderAddr, // market
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        0, // checkBoostState
        0, // 0
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const callData = strategyExecutorByBot.interface.encodeFunctionData('executeStrategy', [
        subId,
        0,
        triggerCallData,
        actionsCallData,
    ]);

    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(repayGasCost, 0, callData);

    console.log(
        `GasUsed callAaveFLV3RepayL2Strategy: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice} and ${addrs[network].AVG_GAS_PRICE} gwei on L2`,
    );
};

const callAaveV3BoostL2Strategy = async (
    botAcc,
    strategyExecutor,
    subId,
    collAddr,
    debtAddr,
    collAssetId,
    debtAssetId,
    boostAmount,
    strategyIndex,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        true, // default market
        placeHolderAddr, // hardcoded because default market is true
        boostAmount, // must stay variable
        placeHolderAddr, // proxy hardcoded
        2, // rateMode: variable
        debtAssetId, // must stay variable can choose diff. asset
        false, // set to true hardcoded
        placeHolderAddr, // set to empty because flag is true
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            debtAddr,
            collAddr,
            '0',
            addrs[network].UNISWAP_WRAPPER,
            0,
            3000,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 1_000_000; // 1 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        boostGasCost,
        collAddr,
        '0',
        '0',
        '10000000',
    );

    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        0, // amount hardcoded from fee taker
        placeHolderAddr, // proxy hardcoded
        collAddr, // is variable as it can change
        collAssetId, // must be variable
        true, // hardcoded always enable as coll
        true, // hardcoded default market
        false, // hardcoded false use on behalf
        placeHolderAddr, // hardcoded with a flag default market
        placeHolderAddr, // hardcoded onBehalf
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        0, // checkBoostState
        0, // 0
    );

    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const callData = strategyExecutorByBot.interface.encodeFunctionData('executeStrategy', [
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
    ]);

    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(boostGasCost, 0, callData);

    console.log(
        `GasUsed callAaveV3BoostL2Strategy: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice} and ${addrs[network].AVG_GAS_PRICE} gwei on L2`,
    );
};

const callAaveFLV3BoostL2Strategy = async (
    botAcc,
    strategyExecutor,
    subId,
    collAddr,
    debtAddr,
    collAssetId,
    debtAssetId,
    boostAmount,
    flAddr,
    strategyIndex,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const flAction = new dfs.actions.flashloan.AaveV3FlashLoanAction(
        [boostAmount],
        [debtAddr],
        [AAVE_NO_DEBT_MODE],
        nullAddress,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            debtAddr,
            collAddr,
            boostAmount,
            addrs[network].UNISWAP_WRAPPER,
            0,
            3000,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 1_320_000; // 1.32 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        boostGasCost,
        collAddr,
        '0',
        '0',
        '10000000',
    );

    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        0, // amount hardcoded from fee taker
        placeHolderAddr, // proxy hardcoded
        collAddr, // is variable as it can change
        collAssetId, // must be variable
        true, // hardcoded always enable as coll
        true, // hardcoded default market
        false, // hardcoded false use on behalf
        placeHolderAddr, // hardcoded with a flag default market
        placeHolderAddr, // hardcoded onBehalf
    );

    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        true, // default market
        placeHolderAddr, // hardcoded because default market is true
        0, // hardcoded from FL
        flAddr, // fl addr
        2, // rateMode: variable
        debtAssetId, // must stay variable can choose diff. asset
        false, // set to false hardcoded
        placeHolderAddr, // set to empty because flag is false
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        0, // checkBoostState
        0, // 0
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const callData = strategyExecutorByBot.interface.encodeFunctionData('executeStrategy', [
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
    ]);

    // eslint-disable-next-line max-len
    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(boostGasCost, 0, callData);

    console.log(
        `GasUsed callAaveFLV3BoostL2Strategy: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice} and ${addrs[network].AVG_GAS_PRICE} gwei on L2`,
    );
};

const callAaveCloseToDebtL2Strategy = async (
    strategyExecutorByBot,
    subId,
    srcTokenInfo,
    destTokenInfo,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '0',
        true,
        MAXUINT,
        placeHolderAddr,
        nullAddress,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(
            srcTokenInfo,
            destTokenInfo,
            hre.ethers.constants.MaxUint256, // amount to sell is variable
        ),
        placeHolderAddr, // hardcoded take from user proxy
        placeHolderAddr, // hardcoded send to user proxy
    );

    const closeGasCost = '1000000';
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        closeGasCost, // must stay variable backend sets gasCost
        placeHolderAddr, // must stay variable as coll can differ
        '0', // hardcoded output from sell action
        '0', // defaults at 0.05%
        closeGasCost, // send custom amount for Optimism
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        true,
        nullAddress,
        MAXUINT, // kept variable (can support partial close later)
        placeHolderAddr,
        '0',
        placeHolderAddr,
        '0',
        false,
        nullAddress,
    );

    const sendAction = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr, // hardcoded Dai is left in proxy
        placeHolderAddr, // hardcoded so only proxy owner receives amount
        MAXUINT, // kept variable (can support partial close later)
    );

    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(sendAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        0,
        triggerCallData,
        actionsCallData,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(
        `GasUsed callAaveCloseToDebtL2Strategy: ${gasUsed}`,
    );

    return receipt;
};

const callAaveFLCloseToDebtL2Strategy = async (
    strategyExecutorByBot,
    subId,
    repayAmount,
    flAsset,
    flAddr,
    srcTokenInfo,
    destTokenInfo,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const flAction = new dfs.actions.flashloan.AaveV3FlashLoanAction(
        [repayAmount],
        [flAsset],
        [AAVE_NO_DEBT_MODE],
        nullAddress,
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        true,
        nullAddress,
        MAXUINT, // kept variable (can support partial close later)
        placeHolderAddr,
        '0',
        placeHolderAddr,
        '0',
        false,
        nullAddress,
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '0',
        true,
        MAXUINT,
        placeHolderAddr,
        nullAddress,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(
            srcTokenInfo,
            destTokenInfo,
            hre.ethers.constants.MaxUint256, // amount to sell is variable
        ),
        placeHolderAddr, // hardcoded take from user proxy
        placeHolderAddr, // hardcoded send to user proxy
    );

    const closeGasCost = '1000000';
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        closeGasCost, // must stay variable backend sets gasCost
        placeHolderAddr, // must stay variable as coll can differ
        '0', // hardcoded output from sell action
        '0', // defaults at 0.05%
        closeGasCost, // send custom amount for Optimism
    );

    const sendAction = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr, // hardcoded only can borrow Dai
        flAddr, // kept variable this can change (FL must be payed back to work)
        '0', // hardcoded output from FL action
    );

    const sendAction1 = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr, // hardcoded Dai is left in proxy
        placeHolderAddr, // hardcoded so only proxy owner receives amount
        MAXUINT, // kept variable (can support partial close later)
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendAction.encodeForRecipe()[0]);
    actionsCallData.push(sendAction1.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        0,
        triggerCallData,
        actionsCallData,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(
        `GasUsed callAaveCloseToDebtL2Strategy: ${gasUsed}`,
    );

    return receipt;
};

const callAaveCloseToCollL2Strategy = async (
    strategyExecutorByBot,
    subId,
    swapAmount,
    srcTokenInfo,
    destTokenInfo,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '0',
        true,
        MAXUINT,
        placeHolderAddr,
        nullAddress,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(
            srcTokenInfo,
            destTokenInfo,
            swapAmount, // amount to sell is variable
        ),
        placeHolderAddr, // hardcoded take from user proxy
        placeHolderAddr, // hardcoded send to user proxy
    );

    const closeGasCost = '1000000';
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        closeGasCost, // must stay variable backend sets gasCost
        placeHolderAddr, // must stay variable as coll can differ
        '0', // hardcoded output from sell action
        '0', // defaults at 0.05%
        closeGasCost, // send custom amount for Optimism
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        true,
        nullAddress,
        MAXUINT, // kept variable (can support partial close later)
        placeHolderAddr,
        '0',
        placeHolderAddr,
        '0',
        false,
        nullAddress,
    );

    const sendAction1 = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr, // hardcoded Dai is left in proxy
        placeHolderAddr, // hardcoded so only proxy owner receives amount
        MAXUINT, // kept variable (can support partial close later)
    );

    const sendAction2 = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr, // hardcoded Dai is left in proxy
        placeHolderAddr, // hardcoded so only proxy owner receives amount
        MAXUINT, // kept variable (can support partial close later)
    );

    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(sendAction1.encodeForRecipe()[0]);
    actionsCallData.push(sendAction2.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        0,
        triggerCallData,
        actionsCallData,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(
        `GasUsed callAaveCloseToCollL2Strategy: ${gasUsed}`,
    );

    return receipt;
};

const callAaveFLCloseToCollL2Strategy = async (
    strategyExecutorByBot,
    subId,
    repayAmount,
    flAsset,
    flAddr,
    swapAmount,
    srcTokenInfo,
    destTokenInfo,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const flAction = new dfs.actions.flashloan.AaveV3FlashLoanAction(
        [repayAmount],
        [flAsset],
        [AAVE_NO_DEBT_MODE],
        nullAddress,
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        true,
        nullAddress,
        MAXUINT, // kept variable (can support partial close later)
        placeHolderAddr,
        '0',
        placeHolderAddr,
        '0',
        false,
        nullAddress,
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '0',
        true,
        MAXUINT,
        placeHolderAddr,
        nullAddress,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(
            srcTokenInfo,
            destTokenInfo,
            swapAmount, // amount to sell is variable
        ),
        placeHolderAddr, // hardcoded take from user proxy
        placeHolderAddr, // hardcoded send to user proxy
    );

    const closeGasCost = '1000000';
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        closeGasCost, // must stay variable backend sets gasCost
        placeHolderAddr, // must stay variable as coll can differ
        '0', // hardcoded output from sell action
        '0', // defaults at 0.05%
        closeGasCost, // send custom amount for Optimism
    );

    const sendAction0 = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr, // hardcoded only can borrow Dai
        flAddr, // kept variable this can change (FL must be payed back to work)
        '0', // hardcoded output from FL action
    );

    const sendAction1 = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr, // hardcoded Dai is left in proxy
        placeHolderAddr, // hardcoded so only proxy owner receives amount
        MAXUINT, // kept variable (can support partial close later)
    );

    const sendAction2 = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr, // hardcoded Dai is left in proxy
        placeHolderAddr, // hardcoded so only proxy owner receives amount
        MAXUINT, // kept variable (can support partial close later)
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendAction0.encodeForRecipe()[0]);
    actionsCallData.push(sendAction1.encodeForRecipe()[0]);
    actionsCallData.push(sendAction2.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        0,
        triggerCallData,
        actionsCallData,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(
        `GasUsed callAaveCloseToCollL2Strategy: ${gasUsed}`,
    );

    return receipt;
};

module.exports = {
    callAaveV3RepayL2Strategy,
    callAaveFLV3RepayL2Strategy,
    callAaveV3BoostL2Strategy,
    callAaveFLV3BoostL2Strategy,
    callAaveCloseToDebtL2Strategy,
    callAaveFLCloseToDebtL2Strategy,
    callAaveCloseToCollL2Strategy,
    callAaveFLCloseToCollL2Strategy,
};
