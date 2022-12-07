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
        true, // useDefaultMarket
        placeHolderAddr, // market
        repayAmount.toString(),
        placeHolderAddr,
        ethAssetId,
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
        [collAssetAddr],
        [repayAmount],
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
        true, // useDefaultMarket
        placeHolderAddr, // market
        0, // fl amount
        flAddr, // flAddr
        collAssetId,
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
        true, // hardcoded default market
        placeHolderAddr, // hardcoded with a flag default market
        0, // amount hardcoded from fee taker
        placeHolderAddr, // proxy hardcoded
        collAddr, // is variable as it can change
        collAssetId, // must be variable
        true, // hardcoded always enable as coll
        false, // hardcoded false use on behalf
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
        [debtAddr],
        [boostAmount],
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
        true, // hardcoded default market
        placeHolderAddr, // hardcoded with a flag default market
        0, // amount hardcoded from fee taker
        placeHolderAddr, // proxy hardcoded
        collAddr, // is variable as it can change
        collAssetId, // must be variable
        true, // hardcoded always enable as coll
        false, // hardcoded false use on behalf
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

const aaveV3CloseActionsEncoded = {
    // eslint-disable-next-line max-len
    flAction: ({ repayAmount, flAsset }) => (new dfs.actions.flashloan.AaveV3FlashLoanAction(
        [flAsset],
        [repayAmount],
        [AAVE_NO_DEBT_MODE],
        nullAddress,
    )).encodeForRecipe()[0],

    paybackAction: ({ repayAmount, rateMode = 2 }) => (new dfs.actions.aaveV3.AaveV3PaybackAction(
        true,
        nullAddress,
        repayAmount,
        placeHolderAddr,
        rateMode,
        placeHolderAddr,
        '0',
        false,
        nullAddress,
    )).encodeForRecipe()[0],

    withdrawAction: ({ withdrawAmount }) => (new dfs.actions.aaveV3.AaveV3WithdrawAction(
        true,
        nullAddress,
        withdrawAmount,
        placeHolderAddr,
        '0',
    )).encodeForRecipe()[0],

    // eslint-disable-next-line max-len
    sellAction: async ({ srcTokenInfo, destTokenInfo, swapAmount }) => (new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(
            srcTokenInfo,
            destTokenInfo,
            swapAmount,
        ),
        placeHolderAddr,
        placeHolderAddr,
    )).encodeForRecipe()[0],

    feeTakingAction: ({ closeGasCost }) => (new dfs.actions.basic.GasFeeActionL2(
        closeGasCost,
        placeHolderAddr,
        '0',
        '0',
        closeGasCost,
    )).encodeForRecipe()[0],

    sendAction: () => (new dfs.actions.basic.SendTokenAndUnwrapAction(
        placeHolderAddr,
        placeHolderAddr,
        MAXUINT,
    )).encodeForRecipe()[0],

    sendRepayFL: ({ flAddr }) => (new dfs.actions.basic.SendTokenAction(
        placeHolderAddr,
        flAddr,
        0,
    )).encodeForRecipe()[0],
};

const callAaveCloseToDebtL2Strategy = async (
    strategyExecutorByBot,
    subId,
    srcTokenInfo,
    destTokenInfo,
    partialAmounts = undefined,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const closeGasCost = '1000000';

    actionsCallData.push(aaveV3CloseActionsEncoded.withdrawAction({
        withdrawAmount: partialAmounts?.withdrawAmount || MAXUINT,
    }));
    // eslint-disable-next-line max-len
    actionsCallData.push(await aaveV3CloseActionsEncoded.sellAction({
        srcTokenInfo, destTokenInfo, swapAmount: MAXUINT,
    }));
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(aaveV3CloseActionsEncoded.paybackAction({
        repayAmount: partialAmounts?.repayAmount || MAXUINT,
    }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

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
    withdrawAmount = undefined,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const closeGasCost = '1000000';

    actionsCallData.push(aaveV3CloseActionsEncoded.flAction({ flAsset, repayAmount }));
    actionsCallData.push(aaveV3CloseActionsEncoded.paybackAction({
        repayAmount: withdrawAmount ? repayAmount : MAXUINT,
    }));
    actionsCallData.push(aaveV3CloseActionsEncoded.withdrawAction({
        withdrawAmount: withdrawAmount || MAXUINT,
    }));
    // eslint-disable-next-line max-len
    actionsCallData.push(await aaveV3CloseActionsEncoded.sellAction({
        srcTokenInfo, destTokenInfo, swapAmount: MAXUINT,
    }));
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendRepayFL({ flAddr }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        1,
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
    partialAmounts = undefined,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const closeGasCost = '1000000';

    actionsCallData.push(aaveV3CloseActionsEncoded.withdrawAction({
        withdrawAmount: partialAmounts?.withdrawAmount || MAXUINT,
    }));
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(await aaveV3CloseActionsEncoded.sellAction({
        srcTokenInfo, destTokenInfo, swapAmount: partialAmounts ? MAXUINT : swapAmount,
    }));
    actionsCallData.push(aaveV3CloseActionsEncoded.paybackAction({
        repayAmount: partialAmounts?.repayAmount || MAXUINT,
    }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

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
    withdrawAmount = undefined,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const closeGasCost = '1000000';

    actionsCallData.push(aaveV3CloseActionsEncoded.flAction({ repayAmount, flAsset }));
    actionsCallData.push(aaveV3CloseActionsEncoded.paybackAction({
        repayAmount: withdrawAmount ? repayAmount : MAXUINT,
    }));
    actionsCallData.push(aaveV3CloseActionsEncoded.withdrawAction({
        withdrawAmount: withdrawAmount || MAXUINT,
    }));
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(await aaveV3CloseActionsEncoded.sellAction({
        srcTokenInfo, destTokenInfo, swapAmount: withdrawAmount ? MAXUINT : swapAmount,
    }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendRepayFL({ flAddr }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        1,
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
    aaveV3CloseActionsEncoded,
};
