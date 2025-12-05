const dfs = require('@defisaver/sdk');
const hre = require('hardhat');

const { getAssetInfo, MAXUINT } = require('@defisaver/tokens');

const {
    formatExchangeObj,
    getGasUsed,
    calcGasToUSD,
    AVG_GAS_PRICE,
    placeHolderAddr,
    WETH_ADDRESS,
    DAI_ADDR,
    UNISWAP_WRAPPER,
    nullAddress,
    fetchAmountinUSDPrice,
    Float2BN,
    getLocalTokenPrice,
    BN2Float,
    LUSD_ADDR,
    formatMockExchangeObj,
    MAX_UINT,
    addrs,
    network,
    BOLD_ADDR,
} = require('../../utils/utils');

const { MCD_MANAGER_ADDR } = require('../../utils/mcd');

const { getTroveInfo, findInsertPosition } = require('../../utils/liquity');
const { CollActionType, DebtActionType } = require('../../utils/liquityV2');
const { getAaveV3ReserveData } = require('../../utils/aave');

const abiCoder = new hre.ethers.utils.AbiCoder();

const executeStrategy = async (
    isL2,
    strategyExecutorByBot,
    subId,
    strategyIndex,
    triggerCallData,
    actionsCallData,
    strategySub,
) => {
    let callData;
    let receipt;

    if (isL2) {
        callData = strategyExecutorByBot.interface.encodeFunctionData('executeStrategy', [
            subId,
            strategyIndex,
            triggerCallData,
            actionsCallData,
        ]);
        receipt = await strategyExecutorByBot.executeStrategy(
            subId,
            strategyIndex,
            triggerCallData,
            actionsCallData,
            { gasLimit: 8000000 },
        );
    } else {
        callData = strategyExecutorByBot.interface.encodeFunctionData('executeStrategy', [
            subId,
            strategyIndex,
            triggerCallData,
            actionsCallData,
            strategySub,
        ]);
        receipt = await strategyExecutorByBot.executeStrategy(
            subId,
            strategyIndex,
            triggerCallData,
            actionsCallData,
            strategySub,
            { gasLimit: 8000000 },
        );
    }
    return { callData, receipt };
};

const callDcaStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    srcToken,
    destToken,
    uniV3Fee,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(srcToken, destToken, '0', addrs[network].UNISWAP_V3_WRAPPER, 0, uniV3Fee),
        placeHolderAddr,
        placeHolderAddr,
    );

    const gasCost = 500_000;
    let feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');

    if (network !== 'mainnet') {
        feeTakingAction = new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0');
    }

    const sendTokenAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
        placeHolderAddr,
        placeHolderAddr,
        0,
    );

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);

    let receipt;

    if (network === 'mainnet') {
        receipt = await strategyExecutorByBot.executeStrategy(
            subId,
            0,
            triggerCallData,
            actionsCallData,
            strategySub,
            {
                gasLimit: 8000000,
            },
        );
    } else {
        receipt = await strategyExecutorByBot.executeStrategy(
            subId,
            0,
            triggerCallData,
            actionsCallData,
            {
                gasLimit: 8000000,
            },
        );
    }

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callDcaStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMcdRepayFromYearnWithExchangeStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    yWethAddr,
    repayAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const withdrawAction = new dfs.actions.yearn.YearnWithdrawAction(
        yWethAddr,
        repayAmount,
        placeHolderAddr,
        placeHolderAddr,
    );

    // sell action
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(WETH_ADDRESS, DAI_ADDR, '0', UNISWAP_WRAPPER),
        placeHolderAddr,
        placeHolderAddr,
    );

    const repayGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, DAI_ADDR, 0);

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        0,
        0,
        placeHolderAddr,
        MCD_MANAGER_ADDR,
    );

    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdPaybackAction.encodeForRecipe()[0]);

    const nextPrice = 0;
    triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], [nextPrice, '0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMcdRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMcdRepayFromYearnStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    yDaiAddr,
    repayAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const withdrawAction = new dfs.actions.yearn.YearnWithdrawAction(
        yDaiAddr,
        repayAmount,
        placeHolderAddr,
        placeHolderAddr,
    );
    const repayGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, DAI_ADDR, 0);

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        0,
        0,
        placeHolderAddr,
        MCD_MANAGER_ADDR,
    );

    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdPaybackAction.encodeForRecipe()[0]);

    const nextPrice = 0;
    triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], [nextPrice, '0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMcdRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMcdRepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    joinAddr,
    collAsset,
    repayAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const ratioAction = new dfs.actions.maker.MakerRatioAction('0');

    const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        '0',
        repayAmount,
        joinAddr,
        placeHolderAddr,
        MCD_MANAGER_ADDR,
    );

    const repayGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        repayGasCost,
        collAsset.address,
        '0',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(collAsset, getAssetInfo('DAI'), '0'),
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
        '1', // ratioState - SHOULD_BE_HIGHER
        false, // if exact triggerRatio should be checked
        '0', // targetRatio
        '0', // vaultId
        '0', // returnValueIndex
    );

    actionsCallData.push(ratioAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdPaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdRatioCheckAction.encodeForRecipe()[0]);

    const nextPrice = 0;
    triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], [nextPrice, '0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMcdRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callFLMcdRepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    flAddr,
    joinAddr,
    collAsset,
    repayAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        [collAsset.address],
        [repayAmount],
    );

    const ratioAction = new dfs.actions.maker.MakerRatioAction('0');

    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(collAsset, getAssetInfo('DAI'), '0'),
        placeHolderAddr,
        placeHolderAddr,
    );

    const repayGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, DAI_ADDR, '0');

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        '0', // vaultId
        '0', // amount
        placeHolderAddr, // proxy
        MCD_MANAGER_ADDR,
    );

    const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        '0',
        repayAmount,
        joinAddr,
        flAddr,
        MCD_MANAGER_ADDR,
    );

    const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
        '1', // ratioState - SHOULD_BE_HIGHER
        false, // if exact triggerRatio should be checked
        '0', // targetRatio
        '0', // vaultId
        '1', // returnValueIndex
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(ratioAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdPaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdRatioCheckAction.encodeForRecipe()[0]);

    // const nextPrice = await getNextEthPrice();
    const nextPrice = 0;

    triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], [nextPrice, '0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callFLMcdRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMcdRepayCompositeStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    joinAddr,
    collAsset,
    repayAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const repayGasCost = 800000; // .8 mil gas

    const repayCompositeAction = new dfs.actions.maker.MakerRepayCompositeAction(
        '0', // '&vaultId'
        joinAddr,
        repayGasCost,
        nullAddress,
        0,
        0,
        0,
        await formatMockExchangeObj(collAsset, getAssetInfo('DAI'), repayAmount),
    );

    actionsCallData.push(repayCompositeAction.encodeForRecipe()[0]);
    triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], ['0', '0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMcdRepayCompositeStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMcdFLRepayCompositeStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    joinAddr,
    collAsset,
    repayAmount,
    flAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const repayGasCost = 800000; // .8 mil gas

    let flashLoanAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        [collAsset.address],
        [repayAmount],
        nullAddress,
        [],
    );

    flashLoanAction = new dfs.actions.flashloan.FLAction(flashLoanAction);

    const repayCompositeAction = new dfs.actions.maker.MakerRepayCompositeAction(
        '0', // '&vaultId'
        joinAddr,
        repayGasCost,
        flAddr,
        0,
        0,
        0,
        await formatMockExchangeObj(collAsset, getAssetInfo('DAI'), repayAmount),
    );

    actionsCallData.push(flashLoanAction.encodeForRecipe()[0]);
    actionsCallData.push(repayCompositeAction.encodeForRecipe()[0]);
    triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], ['0', '0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMcdFLRepayCompositeStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMcdBoostCompositeStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    joinAddr,
    collAsset,
    boostAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const boostGasCost = 800000; // .8 mil gas

    const boostCompositeAction = new dfs.actions.maker.MakerBoostCompositeAction(
        '0', // &vaultId
        joinAddr,
        boostGasCost,
        nullAddress,
        0,
        0,
        0,
        await formatMockExchangeObj(getAssetInfo('DAI'), collAsset, boostAmount),
    );

    actionsCallData.push(boostCompositeAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], ['0', '0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMcdBoostCompositeStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMcdFLBoostCompositeStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    joinAddr,
    collAsset,
    boostAmount,
    flAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const boostGasCost = 800000; // .8 mil gas

    let flashLoanAction = new dfs.actions.flashloan.MakerFlashLoanAction(
        boostAmount,
        nullAddress,
        [],
    );

    flashLoanAction = new dfs.actions.flashloan.FLAction(flashLoanAction);

    const boostCompositeAction = new dfs.actions.maker.MakerBoostCompositeAction(
        '0', // &vaultId
        joinAddr,
        boostGasCost,
        flAddr,
        0, // flAmount is injected
        0,
        0,
        await formatMockExchangeObj(getAssetInfo('DAI'), collAsset, boostAmount),
    );

    actionsCallData.push(flashLoanAction.encodeForRecipe()[0]);
    actionsCallData.push(boostCompositeAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], ['0', '0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMcdFLBoostCompositeStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMcdBoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    joinAddr,
    collAsset,
    boostAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const ratioAction = new dfs.actions.maker.MakerRatioAction('0');

    const generateAction = new dfs.actions.maker.MakerGenerateAction(
        '0',
        boostAmount,
        placeHolderAddr,
        MCD_MANAGER_ADDR,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(getAssetInfo('DAI'), collAsset, '0'),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        boostGasCost,
        collAsset.address,
        '0',
    );

    const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
        '0', // vaultId
        '0', // amount
        joinAddr,
        placeHolderAddr, // proxy
        MCD_MANAGER_ADDR,
    );

    const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
        '0', // ratioState - SHOULD_BE_LOWER
        false,
        '0', // targetRatio
        '0', // vaultId
        '0', // returnValueIndex
    );

    actionsCallData.push(ratioAction.encodeForRecipe()[0]);
    actionsCallData.push(generateAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdSupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdRatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], ['0', '0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMcdBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callFLMcdBoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    flLoanAddr,
    joinAddr,
    collAsset,
    boostAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    // const flAction = new dfs.actions.flashloan.DyDxFlashLoanAction(boostAmount, DAI_ADDR);
    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction([DAI_ADDR], [boostAmount]);

    const ratioAction = new dfs.actions.maker.MakerRatioAction('0');

    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(getAssetInfo('DAI'), collAsset, '0'),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        boostGasCost,
        collAsset.address,
        '0',
    );

    const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
        '0', // vaultId
        '0', // amount
        joinAddr,
        placeHolderAddr, // proxy
        MCD_MANAGER_ADDR,
    );

    const generateAction = new dfs.actions.maker.MakerGenerateAction(
        '0', // vaultId
        '0', // amount
        flLoanAddr,
        MCD_MANAGER_ADDR,
    );

    const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
        '0', // ratioState - SHOULD_BE_LOWER
        false, // if exact triggerRatio should be checked
        '0', // targetRatio
        '0', // vaultId
        '1', // returnValueIndex
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(ratioAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdSupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(generateAction.encodeForRecipe()[0]);
    actionsCallData.push(mcdRatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], ['0', '0']));

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callFLMcdBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callCompRepayStrategy = async (botAcc, strategyExecutor, subId, strategySub, repayAmount) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const compWithdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
        getAssetInfo('cETH').address,
        repayAmount,
        placeHolderAddr,
    );
    const repayGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, WETH_ADDRESS, '0');
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(WETH_ADDRESS, DAI_ADDR, '0', UNISWAP_WRAPPER),
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
        `GasUsed callCompRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callCompBoostStrategy = async (botAcc, strategyExecutor, subId, strategySub, boostAmount) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const compBorrowAction = new dfs.actions.compound.CompoundBorrowAction(
        getAssetInfo('cDAI').address,
        boostAmount,
        placeHolderAddr,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(DAI_ADDR, WETH_ADDRESS, '0', UNISWAP_WRAPPER),
        placeHolderAddr,
        placeHolderAddr,
    );
    const boostGasCost = 1200000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, WETH_ADDRESS, '0');
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
        `GasUsed callCompBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callLimitOrderStrategy = async (
    botAcc,
    minPrice,
    strategyExecutor,
    subId,
    strategySub,
    tokenAddrSell,
    tokenAddrBuy,
    uniV3Fee,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const txGasCost = 500000; // 500k gas
    const l1GasCost = 30000; // 30k gas (just an estimate should be dynamic)

    let sellAction = new dfs.actions.basic.LimitSellAction(
        formatExchangeObj(
            tokenAddrSell,
            tokenAddrBuy,
            '0',
            addrs[network].UNISWAP_V3_WRAPPER,
            0,
            uniV3Fee,
            minPrice.toString(),
        ),
        placeHolderAddr,
        placeHolderAddr,
        txGasCost,
    );

    if (network !== 'mainnet') {
        sellAction = new dfs.actions.basic.LimitSellActionL2(
            formatExchangeObj(
                tokenAddrSell,
                tokenAddrBuy,
                '0',
                addrs[network].UNISWAP_V3_WRAPPER,
                0,
                uniV3Fee,
                minPrice.toString(),
            ),
            placeHolderAddr,
            placeHolderAddr,
            txGasCost,
            l1GasCost,
        );
    }

    triggerCallData.push(abiCoder.encode(['uint256'], [minPrice.toString()]));
    actionsCallData.push(sellAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    let receipt;
    if (network === 'mainnet') {
        receipt = await strategyExecutorByBot.executeStrategy(
            subId,
            0,
            triggerCallData,
            actionsCallData,
            strategySub,
            {
                gasLimit: 8000000,
            },
        );
    } else {
        receipt = await strategyExecutorByBot.executeStrategy(
            subId,
            0,
            triggerCallData,
            actionsCallData,
            {
                gasLimit: 8000000,
            },
        );
    }

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasUsed, AVG_GAS_PRICE);

    console.log(
        `GasUsed callLimitOrderStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMcdCloseToCollStrategy = async (
    proxy,
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    flAmount,
    sellAmount,
    ethJoin,
    makerFlAddr,
    isTrailing = false,
    roundId = 0,
) => {
    const actionsCallData = [];
    const flashLoanAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.MakerFlashLoanAction(flAmount, nullAddress, []),
    );
    const paybackAction = new dfs.actions.maker.MakerPaybackAction(
        '0',
        hre.ethers.constants.MaxUint256,
        placeHolderAddr,
        placeHolderAddr,
    );
    const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        '0',
        hre.ethers.constants.MaxUint256,
        ethJoin,
        placeHolderAddr,
        placeHolderAddr,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            WETH_ADDRESS,
            DAI_ADDR, // can't be placeholder because of proper formatting of uni path
            sellAmount,
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const closeGasCost = 1_200_000;
    const gasFee = new dfs.actions.basic.GasFeeAction(closeGasCost, placeHolderAddr, 0);
    const sendFirst = new dfs.actions.basic.SendTokenAction(placeHolderAddr, makerFlAddr, 0);
    const sendSecond = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );
    const sendColl = new dfs.actions.basic.SendTokenAndUnwrapAction(
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );
    actionsCallData.push(flashLoanAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(gasFee.encodeForRecipe()[0]);
    actionsCallData.push(sendFirst.encodeForRecipe()[0]);
    actionsCallData.push(sendSecond.encodeForRecipe()[0]);
    actionsCallData.push(sendColl.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    const strategyIndex = 0;
    const triggerCallData = [];

    if (isTrailing) {
        triggerCallData.push(abiCoder.encode(['uint256'], [roundId]));
    } else {
        triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], ['0', '0']));
    }
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
        `GasUsed callMcdCloseToCollStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMcdCloseToDaiStrategy = async (
    proxy,
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    flAmount,
    ethJoin,
    makerFlAddr,
    isTrailing = false,
    roundId = 0,
) => {
    const actionsCallData = [];
    const flashLoanAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.MakerFlashLoanAction(flAmount, nullAddress, []),
    );
    const paybackAction = new dfs.actions.maker.MakerPaybackAction(
        '0',
        hre.ethers.constants.MaxUint256,
        placeHolderAddr,
        placeHolderAddr,
    );
    const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        '0',
        hre.ethers.constants.MaxUint256,
        ethJoin,
        placeHolderAddr,
        placeHolderAddr,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            WETH_ADDRESS,
            DAI_ADDR, // can't be placeholder because of proper formatting of uni path
            hre.ethers.constants.MaxUint256,
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const closeGasCost = 1_200_000;
    const gasFee = new dfs.actions.basic.GasFeeAction(closeGasCost, placeHolderAddr, 0);
    const sendFirst = new dfs.actions.basic.SendTokenAction(placeHolderAddr, makerFlAddr, 0);
    const sendSecond = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );
    actionsCallData.push(flashLoanAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(gasFee.encodeForRecipe()[0]);
    actionsCallData.push(sendFirst.encodeForRecipe()[0]);
    actionsCallData.push(sendSecond.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    const strategyIndex = 0;
    const triggerCallData = [];

    if (isTrailing) {
        triggerCallData.push(abiCoder.encode(['uint256'], [roundId]));
    } else {
        triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], ['0', '0']));
    }
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
        `GasUsed callMcdCloseStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callLiquityBoostStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    boostAmount,
    proxyAddr,
    maxFeePercentage,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const { collAmount, debtAmount } = await getTroveInfo(proxyAddr);

    const newDebtAmount = debtAmount.add(boostAmount);
    let { upperHint, lowerHint } = await findInsertPosition(collAmount, newDebtAmount);

    const liquityBorrowAction = new dfs.actions.liquity.LiquityBorrowAction(
        maxFeePercentage,
        boostAmount,
        placeHolderAddr,
        upperHint,
        lowerHint,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            getAssetInfo('LUSD').address,
            getAssetInfo('WETH').address,
            '0',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    // const boostGasCost = 1200000; // 1.2 mil gas
    const boostGasCost = 0; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, WETH_ADDRESS, '0');

    const supplyDollarValue = BN2Float(boostAmount) * getLocalTokenPrice('LUSD');
    const newCollAmount = collAmount.add(
        Float2BN(fetchAmountinUSDPrice('WETH', supplyDollarValue)),
    );
    ({ upperHint, lowerHint } = await findInsertPosition(newCollAmount, newDebtAmount));

    const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
        '0',
        placeHolderAddr,
        upperHint,
        lowerHint,
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction('0', '0');

    actionsCallData.push(liquityBorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquitySupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityRatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = await strategyExecutor.connect(botAcc);

    const strategyId = 0;
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
        `GasUsed callLiquityBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callLiquityFLBoostStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    boostAmount,
    proxyAddr,
    flAddr,
    maxFeePercentage,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const { collAmount, debtAmount } = await getTroveInfo(proxyAddr);

    // fetch a large enough amount to be able to boost
    const collIncrease = Float2BN(fetchAmountinUSDPrice('WETH', (boostAmount / 1e18).toString()));

    const newCollAmount = collAmount.add(collIncrease);
    const newDebtAmount = debtAmount.add(boostAmount);

    const flAmount = boostAmount;
    const exchangeAmount = boostAmount;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            [getAssetInfo('LUSD').address],
            [flAmount],
        ),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            getAssetInfo('LUSD').address,
            getAssetInfo('WETH').address,
            exchangeAmount,
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    // const boostGasCost = 1500000; // 1.5 mil gas
    const boostGasCost = 0; // 1.5 mil gas

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, WETH_ADDRESS, '0');

    const { upperHint, lowerHint } = await findInsertPosition(newCollAmount, newDebtAmount);
    const liquityAdjustAction = new dfs.actions.liquity.LiquityAdjustAction(
        maxFeePercentage,
        '0',
        '0',
        '0',
        '0',
        placeHolderAddr,
        flAddr,
        upperHint,
        lowerHint,
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction('0', '0');

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityAdjustAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityRatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = await strategyExecutor.connect(botAcc);

    const strategyId = 1;
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
        `GasUsed callLiquityFLBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callLiquityFLBoostWithCollStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    boostAmount,
    proxyAddr,
    flAddr,
    maxFeePercentage,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const { collAmount, debtAmount } = await getTroveInfo(proxyAddr);

    // fetch a large enough amount to be able to boost
    const flAmount = Float2BN(fetchAmountinUSDPrice('WETH', (boostAmount / 1e18).toString()));
    const flAmountWeGotBack = flAmount;

    const newCollAmount = collAmount.add(flAmountWeGotBack);
    const newDebtAmount = debtAmount.add(boostAmount);

    const newCollAmountAfterSell = newCollAmount.add(flAmountWeGotBack);
    const newCollAmountAfterSellAndSupply = newCollAmount;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            [getAssetInfo('WETH').address],
            [flAmount],
        ),
    );

    let { upperHint, lowerHint } = await findInsertPosition(newCollAmount, newDebtAmount);
    const liquityAdjustAction = new dfs.actions.liquity.LiquityAdjustAction(
        maxFeePercentage,
        flAmountWeGotBack,
        boostAmount,
        '0',
        '0',
        placeHolderAddr,
        placeHolderAddr,
        upperHint,
        lowerHint,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            getAssetInfo('LUSD').address,
            getAssetInfo('WETH').address,
            0,
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    // const boostGasCost = 1500000; // 1.5 mil gas
    const boostGasCost = 0; // 1.5 mil gas

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, WETH_ADDRESS, '0');

    ({ upperHint, lowerHint } = await findInsertPosition(newCollAmountAfterSell, newDebtAmount));
    const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
        0, // piped from fee taker
        placeHolderAddr, // proxy
        upperHint,
        lowerHint,
    );

    ({ upperHint, lowerHint } = await findInsertPosition(
        newCollAmountAfterSellAndSupply,
        newDebtAmount,
    ));
    const liquityWithdrawAction = new dfs.actions.liquity.LiquityWithdrawAction(
        0, // hardcoded input from FL
        flAddr,
        upperHint,
        lowerHint,
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction('0', '0');

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityAdjustAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquitySupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityWithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityRatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = await strategyExecutor.connect(botAcc);

    const strategyId = 2;
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
        `GasUsed callLiquityFLBoostWithCollStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callLiquityRepayStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    repayAmount,
    proxyAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const { collAmount, debtAmount } = await getTroveInfo(proxyAddr);

    const newCollAmount = collAmount.sub(repayAmount);
    let { upperHint, lowerHint } = await findInsertPosition(newCollAmount, debtAmount);

    const liquityWithdrawAction = new dfs.actions.liquity.LiquityWithdrawAction(
        repayAmount,
        placeHolderAddr,
        upperHint,
        lowerHint,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            getAssetInfo('WETH').address,
            getAssetInfo('LUSD').address,
            '0',
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    // const repayGasCost = 1200000; // 1.2 mil gas
    const repayGasCost = 0; // 1.2 mil gas

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        repayGasCost,
        getAssetInfo('LUSD').address,
        '0',
    );

    const repayDollarValue = BN2Float(repayAmount) * getLocalTokenPrice('WETH');
    const newDebtAmount = debtAmount.sub(Float2BN(fetchAmountinUSDPrice('LUSD', repayDollarValue)));
    ({ upperHint, lowerHint } = await findInsertPosition(newCollAmount, newDebtAmount));

    const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '0',
        placeHolderAddr,
        upperHint,
        lowerHint,
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction('0', '0');

    actionsCallData.push(liquityWithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityPaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityRatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = await strategyExecutor.connect(botAcc);

    const strategyId = 0;
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
        `GasUsed callLiquityRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callLiquityFLRepayStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    repayAmount,
    proxyAddr,
    flAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const { collAmount, debtAmount } = await getTroveInfo(proxyAddr);
    const repayDollarValue = BN2Float(repayAmount) * getLocalTokenPrice('WETH');
    const newDebtAmount = debtAmount.sub(Float2BN(fetchAmountinUSDPrice('LUSD', repayDollarValue)));
    const newCollAmount = collAmount.sub(repayAmount);

    const flAmount = repayAmount;
    const exchangeAmount = repayAmount;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            [getAssetInfo('WETH').address],
            [flAmount],
        ),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            getAssetInfo('WETH').address,
            getAssetInfo('LUSD').address,
            exchangeAmount,
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    // const repayGasCost = 1200000; // 1.2 mil gas
    const repayGasCost = 0; // 1.2 mil gas

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        repayGasCost,
        getAssetInfo('LUSD').address,
        '0',
    );

    const { upperHint, lowerHint } = await findInsertPosition(newCollAmount, newDebtAmount);
    const liquityAdjustAction = new dfs.actions.liquity.LiquityAdjustAction(
        '0', // no liquity fee charged in recipe
        '0',
        '0',
        '0',
        '0',
        placeHolderAddr,
        flAddr,
        upperHint,
        lowerHint,
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction('0', '0');

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityAdjustAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityRatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = await strategyExecutor.connect(botAcc);

    const strategyId = 1;
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
        `GasUsed callLiquityFLRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callLiquityCloseToCollStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    flAmount,
    balancerFlAddr,
    isTrailing = false,
    roundId = 0,
) => {
    const actionsCallData = [];
    const flashLoanAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        [WETH_ADDRESS], // weth
        [flAmount],
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            WETH_ADDRESS,
            LUSD_ADDR, // can't be placeholder because of proper formatting of uni path
            flAmount, // piped from fl
            UNISWAP_WRAPPER,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const liquityCloseAction = new dfs.actions.liquity.LiquityCloseAction(
        placeHolderAddr, // hardcoded take lusd from proxy
        placeHolderAddr, // hardcoded send to proxy
    );

    const closeGasCost = 1_500_000;
    const gasFee = new dfs.actions.basic.GasFeeAction(closeGasCost, placeHolderAddr, 0);
    const sendFL = new dfs.actions.basic.SendTokenAction(placeHolderAddr, balancerFlAddr, 0);
    const sendWethToEOA = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );
    const sendLUSD = new dfs.actions.basic.SendTokenAndUnwrapAction(
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );
    actionsCallData.push(flashLoanAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityCloseAction.encodeForRecipe()[0]);
    actionsCallData.push(gasFee.encodeForRecipe()[0]);
    actionsCallData.push(sendFL.encodeForRecipe()[0]);
    actionsCallData.push(sendWethToEOA.encodeForRecipe()[0]);
    actionsCallData.push(sendLUSD.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    const strategyIndex = 0;
    const triggerCallData = [];

    if (isTrailing) {
        triggerCallData.push(abiCoder.encode(['uint256'], [roundId]));
    } else {
        triggerCallData.push(abiCoder.encode(['uint256', 'uint8'], ['0', '0']));
    }

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
        `GasUsed callMcdCloseToCollStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV2BoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    collAddr,
    debtAddr,
    boostAmount,
    exchangeWrapper,
) => {
    const actionsCallData = [];

    const borrowAction = new dfs.actions.aave.AaveBorrowAction(
        placeHolderAddr, // market hardcoded
        debtAddr, // token variable debt address
        boostAmount, // amount to borrow (variable)
        2, // rate mode variable
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded proxy address
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            debtAddr, // must stay variable
            collAddr, // must stay variable
            '0', //  hardcoded piped from borrow
            exchangeWrapper, // can pick exchange wrapper
        ),
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded proxy address
    );

    const gasCost = 1_000_000;

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        gasCost, // must stay variable backend sets gasCost
        collAddr, // must stay variable as coll can differ
        '0', // hardcoded output from withdraw action
    );

    const supplyAction = new dfs.actions.aave.AaveSupplyAction(
        placeHolderAddr, // market hardcoded
        collAddr, // cToken variable coll address
        '0', // amount hardcoded from feeTakeAction
        placeHolderAddr, // proxy hardcoded from address
        placeHolderAddr, // proxy hardcoded onBehalf address
        true, // hardcoded always enable as coll
    );

    const checkerAction = new dfs.actions.checkers.AaveV2RatioCheckAction(
        '0', // hardcoded boost state
        '0', // hardcoded target ratio
    );

    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callAaveV2BoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveFLV2BoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    collAddr,
    debtAddr,
    boostAmount,
    exchangeWrapper,
    flAddr,
) => {
    const actionsCallData = [];

    let flashLoanAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        [debtAddr],
        [boostAmount],
        [],
    );

    flashLoanAction = new dfs.actions.flashloan.FLAction(flashLoanAction);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            debtAddr, // must stay variable
            collAddr, // must stay variable
            boostAmount, //  boostAmount
            exchangeWrapper, // can pick exchange wrapper
        ),
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded proxy address
    );

    const gasCost = 1_400_000;

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        gasCost, // must stay variable backend sets gasCost
        collAddr, // must stay variable as coll can differ
        '0', // hardcoded output from sell action
    );

    const supplyAction = new dfs.actions.aave.AaveSupplyAction(
        placeHolderAddr, // market hardcoded
        collAddr, // cToken variable coll address
        '0', // amount hardcoded from feeTakeAction
        placeHolderAddr, // proxy hardcoded from address
        placeHolderAddr, // proxy hardcoded onBehalf address
        true, // hardcoded always enable as coll
    );

    const borrowAction = new dfs.actions.aave.AaveBorrowAction(
        placeHolderAddr, // market hardcoded
        debtAddr, // token variable debt address
        '0', // fl amount hardcoded
        2, // rate mode variable
        flAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded onBehalf address
    );

    const checkerAction = new dfs.actions.checkers.AaveV2RatioCheckAction(
        '0', // hardcoded boost state
        '0', // hardcoded target ratio
    );

    actionsCallData.push(flashLoanAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callAaveFLV2BoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV2RepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    collAddr,
    debtAddr,
    repayAmount,
    exchangeWrapper,
) => {
    const actionsCallData = [];

    const withdrawAction = new dfs.actions.aave.AaveWithdrawAction(
        placeHolderAddr, // market hardcoded
        collAddr, // variable (backend picks which asset to swap)
        repayAmount, // must stay variable
        placeHolderAddr, // proxy hardcoded to address
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            collAddr, // must stay variable
            debtAddr, // must stay variable
            '0', //  hardcoded piped from borrow
            exchangeWrapper, // can pick exchange wrapper
        ),
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded proxy address
    );

    const gasCost = 1_000_000;

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        gasCost, // must stay variable backend sets gasCost
        debtAddr, // must stay variable as coll can differ
        '0', // hardcoded output from withdraw action
    );

    const paybackAction = new dfs.actions.aave.AavePaybackAction(
        placeHolderAddr, // market hardcoded
        debtAddr, // variable cToken coll address
        '0', // amount hardcoded
        '2', // rate mode variable
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded onBehalf address
    );

    const checkerAction = new dfs.actions.checkers.AaveV2RatioCheckAction(
        '0', // hardcoded boost state
        '0', // hardcoded target ratio
    );

    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callAaveV2RepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveFLV2RepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    collAddr,
    debtAddr,
    repayAmount,
    exchangeWrapper,
    flAddr,
) => {
    const actionsCallData = [];

    let flashLoanAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        [collAddr],
        [repayAmount],
        [],
    );

    flashLoanAction = new dfs.actions.flashloan.FLAction(flashLoanAction);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            collAddr, // must stay variable
            debtAddr, // must stay variable
            repayAmount, //   fl amount
            exchangeWrapper, // can pick exchange wrapper
        ),
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded proxy address
    );

    const gasCost = 1_000_000;

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        gasCost, // must stay variable backend sets gasCost
        debtAddr, // must stay variable as debt can differ
        '0', // hardcoded output from withdraw action
    );

    const paybackAction = new dfs.actions.aave.AavePaybackAction(
        placeHolderAddr, // market hardcoded
        debtAddr, // variable cToken coll address
        '0', // amount hardcoded
        '2', // rate mode variable
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded onBehalf address
    );

    const withdrawAction = new dfs.actions.aave.AaveWithdrawAction(
        placeHolderAddr, // market hardcoded
        collAddr, // variable (backend picks which asset to swap)
        '0', // hardcoded from FL
        flAddr, // proxy hardcoded to address
    );

    const checkerAction = new dfs.actions.checkers.AaveV2RatioCheckAction(
        '0', // hardcoded boost state
        '0', // hardcoded target ratio
    );

    actionsCallData.push(flashLoanAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callAaveV2RepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callCompV2BoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    cCollAddr,
    cDebtAddr,
    collAddr,
    debtAddr,
    boostAmount,
    exchangeWrapper,
) => {
    const actionsCallData = [];

    const borrowAction = new dfs.actions.compound.CompoundBorrowAction(
        cDebtAddr, // cToken variable debt address
        boostAmount, // amount to borrow (variable)
        placeHolderAddr, // hardcoded proxy address
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            debtAddr, // must stay variable
            collAddr, // must stay variable
            '0', //  hardcoded piped from borrow
            exchangeWrapper, // can pick exchange wrapper
        ),
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded proxy address
    );

    const gasCost = 1_000_000;

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        gasCost, // must stay variable backend sets gasCost
        collAddr, // must stay variable as coll can differ
        '0', // hardcoded output from withdraw action
    );

    const supplyAction = new dfs.actions.compound.CompoundSupplyAction(
        cCollAddr, // cToken variable coll address
        '0', // amount hardcoded from feeTakeAction
        placeHolderAddr, // proxy hardcoded from address
        true, // hardcoded always enable as coll
    );

    const checkerAction = new dfs.actions.checkers.CompoundV2RatioCheckAction(
        '0', // hardcoded boost state
        '0', // hardcoded target ratio
    );

    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callCompV2BoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callCompFLV2BoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    cCollAddr,
    cDebtAddr,
    collAddr,
    debtAddr,
    boostAmount,
    exchangeWrapper,
    flAddr,
) => {
    const actionsCallData = [];

    let flashLoanAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        [debtAddr],
        [boostAmount],
        [],
    );

    flashLoanAction = new dfs.actions.flashloan.FLAction(flashLoanAction);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            debtAddr, // must stay variable
            collAddr, // must stay variable
            boostAmount, //  boostAmount
            exchangeWrapper, // can pick exchange wrapper
        ),
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded proxy address
    );

    const gasCost = 1_400_000;

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        gasCost, // must stay variable backend sets gasCost
        collAddr, // must stay variable as coll can differ
        '0', // hardcoded output from sell action
    );

    const supplyAction = new dfs.actions.compound.CompoundSupplyAction(
        cCollAddr, // cToken variable coll address
        '0', // amount hardcoded from feeTakeAction
        placeHolderAddr, // proxy hardcoded from address
        true, // hardcoded always enable as coll
    );

    const borrowAction = new dfs.actions.compound.CompoundBorrowAction(
        cDebtAddr, // cToken variable debt address
        '0', // hardcoded amount from FL
        flAddr, // repay fl loan
    );

    const checkerAction = new dfs.actions.checkers.CompoundV2RatioCheckAction(
        '0', // hardcoded boost state
        '0', // hardcoded target ratio
    );

    actionsCallData.push(flashLoanAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callCompFLV2BoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callCompV2RepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    cCollAddr,
    cDebtAddr,
    collAddr,
    debtAddr,
    repayAmount,
    exchangeWrapper,
) => {
    const actionsCallData = [];

    const withdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
        cCollAddr, // variable (backend picks which asset to swap)
        repayAmount, // must stay variable
        placeHolderAddr, // proxy hardcoded to address
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            collAddr, // must stay variable
            debtAddr, // must stay variable
            '0', //  hardcoded piped from borrow
            exchangeWrapper, // can pick exchange wrapper
        ),
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded proxy address
    );

    const gasCost = 1_000_000;

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        gasCost, // must stay variable backend sets gasCost
        debtAddr, // must stay variable as coll can differ
        '0', // hardcoded output from withdraw action
    );

    const paybackAction = new dfs.actions.compound.CompoundPaybackAction(
        cDebtAddr, // variable cToken coll address
        '0', // amount hardcoded
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded proxy address
    );

    const checkerAction = new dfs.actions.checkers.CompoundV2RatioCheckAction(
        '0', // hardcoded boost state
        '0', // hardcoded target ratio
    );

    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callCompV2RepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callCompFLV2RepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    cCollAddr,
    cDebtAddr,
    collAddr,
    debtAddr,
    repayAmount,
    exchangeWrapper,
    flAddr,
) => {
    const actionsCallData = [];

    let flashLoanAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        [collAddr],
        [repayAmount],
        [],
    );

    flashLoanAction = new dfs.actions.flashloan.FLAction(flashLoanAction);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            collAddr, // must stay variable
            debtAddr, // must stay variable
            repayAmount, //   fl amount
            exchangeWrapper, // can pick exchange wrapper
        ),
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded proxy address
    );

    const gasCost = 1_000_000;

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        gasCost, // must stay variable backend sets gasCost
        debtAddr, // must stay variable as debt can differ
        '0', // hardcoded output from withdraw action
    );

    const paybackAction = new dfs.actions.compound.CompoundPaybackAction(
        cDebtAddr, // variable cToken debt address
        '0', // amount hardcoded
        placeHolderAddr, // hardcoded proxy address
        placeHolderAddr, // hardcoded proxy address
    );

    const withdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
        cCollAddr, // variable (backend picks which asset to swap)
        '0', // hardcoded from FL
        flAddr, // proxy hardcoded to address
    );

    const checkerAction = new dfs.actions.checkers.CompoundV2RatioCheckAction(
        '0', // hardcoded boost state
        '0', // hardcoded target ratio
    );

    actionsCallData.push(flashLoanAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(checkerAction.encodeForRecipe()[0]);

    const triggerCallData = [hre.ethers.utils.defaultAbiCoder.encode(['uint256'], ['0'])];

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callCompV2RepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const AAVE_NO_DEBT_MODE = 0;

const callSparkRepayStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    ethAssetId,
    daiAssetId,
    collAssetAddr,
    debtAssetAddr,
    repayAmount,
    strategyIndex,
    sub,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const withdrawAction = new dfs.actions.spark.SparkWithdrawAction(
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
            addrs[network].UNISWAP_V3_WRAPPER,
            0,
            3000,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const repayGasCost = 1_000_000; // 1 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        repayGasCost,
        debtAssetAddr,
        '0',
        '0',
        '10000000',
    );

    const paybackAction = new dfs.actions.spark.SparkPaybackAction(
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

    const checkerAction = new dfs.actions.checkers.SparkRatioCheckAction(
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
        sub,
    ]);

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(repayGasCost, 0, callData);

    console.log(
        `GasUsed callSparkRepayStrategy: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice} and ${addrs[network].AVG_GAS_PRICE} gwei`,
    );
};

const callSparkFLRepayStrategy = async (
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
    sub,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.SparkFlashLoanAction(
            [collAssetAddr],
            [repayAmount],
            [AAVE_NO_DEBT_MODE],
            nullAddress,
        ),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            collAssetAddr,
            debtAssetAddr,
            repayAmount,
            addrs[network].UNISWAP_V3_WRAPPER,
            0,
            3000,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const repayGasCost = 1_330_000; // 1.33 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        repayGasCost,
        debtAssetAddr,
        '0',
        '0',
        '10000000',
    );

    const paybackAction = new dfs.actions.spark.SparkPaybackAction(
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

    const withdrawAction = new dfs.actions.spark.SparkWithdrawAction(
        true, // useDefaultMarket
        placeHolderAddr, // market
        0, // fl amount
        flAddr, // flAddr
        collAssetId,
    );

    const checkerAction = new dfs.actions.checkers.SparkRatioCheckAction(
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
        sub,
    ]);

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(repayGasCost, 0, callData);

    console.log(
        `GasUsed callSparkFLRepayStrategy: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice} and ${addrs[network].AVG_GAS_PRICE} gwei`,
    );
};

const callSparkBoostStrategy = async (
    botAcc,
    strategyExecutor,
    subId,
    collAddr,
    debtAddr,
    collAssetId,
    debtAssetId,
    boostAmount,
    strategyIndex,
    sub,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const borrowAction = new dfs.actions.spark.SparkBorrowAction(
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
        formatExchangeObj(debtAddr, collAddr, '0', addrs[network].UNISWAP_V3_WRAPPER, 0, 3000),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 1_000_000; // 1 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        boostGasCost,
        collAddr,
        '0',
        '0',
        '10000000',
    );

    const supplyAction = new dfs.actions.spark.SparkSupplyAction(
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

    const checkerAction = new dfs.actions.checkers.SparkRatioCheckAction(
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
        sub,
    ]);

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(boostGasCost, 0, callData);

    console.log(
        `GasUsed callSparkBoostStrategy: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice} and ${addrs[network].AVG_GAS_PRICE} gwei`,
    );
};

const callSparkFLBoostStrategy = async (
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
    sub,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.SparkFlashLoanAction(
            [debtAddr],
            [boostAmount],
            [AAVE_NO_DEBT_MODE],
            nullAddress,
        ),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            debtAddr,
            collAddr,
            boostAmount,
            addrs[network].UNISWAP_V3_WRAPPER,
            0,
            3000,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 1_320_000; // 1.32 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        boostGasCost,
        collAddr,
        '0',
        '0',
        '10000000',
    );

    const supplyAction = new dfs.actions.spark.SparkSupplyAction(
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

    const borrowAction = new dfs.actions.spark.SparkBorrowAction(
        true, // default market
        placeHolderAddr, // hardcoded because default market is true
        0, // hardcoded from FL
        flAddr, // fl addr
        2, // rateMode: variable
        debtAssetId, // must stay variable can choose diff. asset
        false, // set to false hardcoded
        placeHolderAddr, // set to empty because flag is false
    );

    const checkerAction = new dfs.actions.checkers.SparkRatioCheckAction(
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
        sub,
    ]);

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(boostGasCost, 0, callData);

    console.log(
        `GasUsed callSparkFLBoostStrategy: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice} and ${addrs[network].AVG_GAS_PRICE} gwei`,
    );
};

const callLiquityDsrPaybackStrategy = async ({
    strategyExecutorByBot,
    subId,
    sub,
    proxy,
    daiWithdrawAmount,
}) => {
    const daiInfo = getAssetInfo('DAI');
    const lusdInfo = getAssetInfo('LUSD');
    const strategyGasCost = 1_500_000;

    const { collAmount, debtAmount } = await getTroveInfo(proxy.address);
    const newDebtAmount = debtAmount.sub(daiWithdrawAmount);
    const { upperHint, lowerHint } = await findInsertPosition(collAmount, newDebtAmount);

    const actionsCallData = [];

    const dsrWithdrawAction = new dfs.actions.maker.MakerDsrWithdrawAction(
        daiWithdrawAmount,
        placeHolderAddr,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(
            daiInfo, // these two are piped from subdata
            lusdInfo, // but are needed here for mock wrapper setup
            '0',
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        strategyGasCost,
        placeHolderAddr,
        '0',
    );

    const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '0',
        placeHolderAddr,
        upperHint,
        lowerHint,
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction('0', '0');

    actionsCallData.push(dsrWithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityPaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityRatioCheckAction.encodeForRecipe()[0]);

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        0,
        ['0x'],
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(`GasUsed callLiquityDsrPaybackStrategy: ${gasUsed}`);

    return receipt;
};

const callLiquityDsrSupplyStrategy = async ({
    strategyExecutorByBot,
    subId,
    sub,
    proxy,
    daiWithdrawAmount,
}) => {
    const daiInfo = getAssetInfo('DAI');
    const wethInfo = getAssetInfo('WETH');
    const strategyGasCost = 1_500_000;

    const daiWithdrawAmountInEth = daiWithdrawAmount.div(
        Float2BN(getLocalTokenPrice('ETH').toString()),
    );
    const { collAmount, debtAmount } = await getTroveInfo(proxy.address);
    const newCollAmount = collAmount.add(daiWithdrawAmountInEth);
    const { upperHint, lowerHint } = await findInsertPosition(newCollAmount, debtAmount);

    const actionsCallData = [];

    const dsrWithdrawAction = new dfs.actions.maker.MakerDsrWithdrawAction(
        daiWithdrawAmount,
        placeHolderAddr,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        await formatMockExchangeObj(
            daiInfo, // these two are piped from subdata
            wethInfo, // but are needed here for mock wrapper setup
            '0',
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        strategyGasCost,
        placeHolderAddr,
        '0',
    );

    const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
        '0',
        placeHolderAddr,
        upperHint,
        lowerHint,
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction('0', '0');

    actionsCallData.push(dsrWithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquitySupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityRatioCheckAction.encodeForRecipe()[0]);

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        0,
        ['0x'],
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(`GasUsed callLiquityDsrSupplyStrategy: ${gasUsed}`);

    return receipt;
};

const callLiquityDebtInFrontRepayStrategy = async (
    botAcc,
    strategyExecutor,
    proxyAddr,
    subId,
    strategySub,
    repayAmount,
    flAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];

    const { collAmount, debtAmount } = await getTroveInfo(proxyAddr);
    const repayDollarValue = BN2Float(repayAmount) * getLocalTokenPrice('WETH');
    const newDebtAmount = debtAmount.sub(Float2BN(fetchAmountinUSDPrice('LUSD', repayDollarValue)));
    const newCollAmount = collAmount.sub(repayAmount);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([WETH_ADDRESS], [repayAmount]),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(WETH_ADDRESS, LUSD_ADDR, repayAmount, UNISWAP_WRAPPER),
        placeHolderAddr,
        placeHolderAddr,
    );

    const repayGasCost = 1_500_000; // 1.5 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, LUSD_ADDR, '0');

    const { upperHint, lowerHint } = await findInsertPosition(newCollAmount, newDebtAmount);

    const liquityAdjustAction = new dfs.actions.liquity.LiquityAdjustAction(
        '0', // no liquity fee charged in recipe
        '0',
        '0',
        '0',
        '0',
        placeHolderAddr,
        flAddr,
        upperHint,
        lowerHint,
    );

    const liquityRatioIncreaseCheckAction =
        new dfs.actions.checkers.LiquityRatioIncreaseCheckAction(
            '0', // target ratio set
        );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityAdjustAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityRatioIncreaseCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const strategyExecutorByBot = await strategyExecutor.connect(botAcc);

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
        `GasUsed callLiquityDebtInFrontRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const aaveV3CloseActionsEncoded = {
    flAction: ({ repayAmount, flAsset }) =>
        new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.AaveV3FlashLoanAction(
                [flAsset],
                [repayAmount],
                [AAVE_NO_DEBT_MODE],
                nullAddress,
            ),
        ).encodeForRecipe()[0],

    paybackAction: ({ repayAmount, rateMode = 2 }) =>
        new dfs.actions.aaveV3.AaveV3PaybackAction(
            true,
            nullAddress,
            repayAmount,
            placeHolderAddr,
            rateMode,
            placeHolderAddr,
            '0',
            false,
            nullAddress,
        ).encodeForRecipe()[0],

    withdrawAction: ({ withdrawAmount }) =>
        new dfs.actions.aaveV3.AaveV3WithdrawAction(
            true,
            nullAddress,
            withdrawAmount,
            placeHolderAddr,
            '0',
        ).encodeForRecipe()[0],

    sellAction: async ({ srcTokenInfo, destTokenInfo, swapAmount }) =>
        new dfs.actions.basic.SellAction(
            await formatMockExchangeObj(srcTokenInfo, destTokenInfo, swapAmount),
            placeHolderAddr,
            placeHolderAddr,
        ).encodeForRecipe()[0],

    feeTakingAction: ({ closeGasCost }) =>
        new dfs.actions.basic.GasFeeActionL2(
            closeGasCost,
            placeHolderAddr,
            '0',
            '0',
            closeGasCost,
        ).encodeForRecipe()[0],

    sendAction: () =>
        new dfs.actions.basic.SendTokenAndUnwrapAction(
            placeHolderAddr,
            placeHolderAddr,
            MAXUINT,
        ).encodeForRecipe()[0],

    sendRepayFL: ({ flAddr }) =>
        new dfs.actions.basic.SendTokenAction(placeHolderAddr, flAddr, 0).encodeForRecipe()[0],
};

const callAaveCloseToDebtWithMaximumGasPriceStrategy = async (
    strategyExecutorByBot,
    subId,
    sub,
    srcTokenInfo,
    destTokenInfo,
    partialAmounts = undefined,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const closeGasCost = '1000000';

    actionsCallData.push(
        aaveV3CloseActionsEncoded.withdrawAction({
            withdrawAmount: partialAmounts?.withdrawAmount || MAXUINT,
        }),
    );
    actionsCallData.push(
        await aaveV3CloseActionsEncoded.sellAction({
            srcTokenInfo,
            destTokenInfo,
            swapAmount: MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(
        aaveV3CloseActionsEncoded.paybackAction({
            repayAmount: partialAmounts?.repayAmount || MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

    // price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
    // gas price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        0,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(`GasUsed callAaveCloseToDebtWithMaximumGasPriceStrategy: ${gasUsed}`);

    return receipt;
};

const callAaveCloseToDebtStrategy = async (
    strategyExecutorByBot,
    subId,
    sub,
    srcTokenInfo,
    destTokenInfo,
    partialAmounts = undefined,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const closeGasCost = '1000000';

    actionsCallData.push(
        aaveV3CloseActionsEncoded.withdrawAction({
            withdrawAmount: partialAmounts?.withdrawAmount || MAXUINT,
        }),
    );
    actionsCallData.push(
        await aaveV3CloseActionsEncoded.sellAction({
            srcTokenInfo,
            destTokenInfo,
            swapAmount: MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(
        aaveV3CloseActionsEncoded.paybackAction({
            repayAmount: partialAmounts?.repayAmount || MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

    // price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        0,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(`GasUsed callAaveCloseToDebtStrategy: ${gasUsed}`);

    return receipt;
};

const callAaveFLCloseToDebtWithMaximumGasPriceStrategy = async (
    strategyExecutorByBot,
    subId,
    sub,
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

    actionsCallData.push(
        aaveV3CloseActionsEncoded.flAction({
            flAsset,
            repayAmount,
        }),
    );
    actionsCallData.push(
        aaveV3CloseActionsEncoded.paybackAction({
            repayAmount: withdrawAmount ? repayAmount : MAXUINT,
        }),
    );
    actionsCallData.push(
        aaveV3CloseActionsEncoded.withdrawAction({
            withdrawAmount: withdrawAmount || MAXUINT,
        }),
    );
    actionsCallData.push(
        await aaveV3CloseActionsEncoded.sellAction({
            srcTokenInfo,
            destTokenInfo,
            swapAmount: MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendRepayFL({ flAddr }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

    // price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
    // gas price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        1,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(`GasUsed callAaveFLCloseToDebtWithMaximumGasPriceStrategy: ${gasUsed}`);

    return receipt;
};

const callAaveFLCloseToDebtStrategy = async (
    strategyExecutorByBot,
    subId,
    sub,
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

    actionsCallData.push(
        aaveV3CloseActionsEncoded.flAction({
            flAsset,
            repayAmount,
        }),
    );
    actionsCallData.push(
        aaveV3CloseActionsEncoded.paybackAction({
            repayAmount: withdrawAmount ? repayAmount : MAXUINT,
        }),
    );
    actionsCallData.push(
        aaveV3CloseActionsEncoded.withdrawAction({
            withdrawAmount: withdrawAmount || MAXUINT,
        }),
    );
    actionsCallData.push(
        await aaveV3CloseActionsEncoded.sellAction({
            srcTokenInfo,
            destTokenInfo,
            swapAmount: MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendRepayFL({ flAddr }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

    // price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        1,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(`GasUsed callAaveFLCloseToDebtStrategy: ${gasUsed}`);

    return receipt;
};

const callAaveCloseToCollWithMaximumGasPriceStrategy = async (
    strategyExecutorByBot,
    subId,
    sub,
    swapAmount,
    srcTokenInfo,
    destTokenInfo,
    partialAmounts = undefined,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const closeGasCost = '1000000';

    actionsCallData.push(
        aaveV3CloseActionsEncoded.withdrawAction({
            withdrawAmount: partialAmounts?.withdrawAmount || MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(
        await aaveV3CloseActionsEncoded.sellAction({
            srcTokenInfo,
            destTokenInfo,
            swapAmount: partialAmounts ? MAXUINT : swapAmount,
        }),
    );
    actionsCallData.push(
        aaveV3CloseActionsEncoded.paybackAction({
            repayAmount: partialAmounts?.repayAmount || MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

    // price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
    // gas price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        0,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(`GasUsed callAaveCloseToCollWithMaximumGasPriceStrategy: ${gasUsed}`);

    return receipt;
};

const callAaveCloseToCollStrategy = async (
    strategyExecutorByBot,
    subId,
    sub,
    swapAmount,
    srcTokenInfo,
    destTokenInfo,
    partialAmounts = undefined,
) => {
    const actionsCallData = [];
    const triggerCallData = [];

    const closeGasCost = '1000000';

    actionsCallData.push(
        aaveV3CloseActionsEncoded.withdrawAction({
            withdrawAmount: partialAmounts?.withdrawAmount || MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(
        await aaveV3CloseActionsEncoded.sellAction({
            srcTokenInfo,
            destTokenInfo,
            swapAmount: partialAmounts ? MAXUINT : swapAmount,
        }),
    );
    actionsCallData.push(
        aaveV3CloseActionsEncoded.paybackAction({
            repayAmount: partialAmounts?.repayAmount || MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

    // price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        0,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(`GasUsed callAaveCloseToCollStrategy: ${gasUsed}`);

    return receipt;
};

const callAaveFLCloseToCollWithMaximumGasPriceStrategy = async (
    strategyExecutorByBot,
    subId,
    sub,
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

    actionsCallData.push(
        aaveV3CloseActionsEncoded.flAction({
            repayAmount,
            flAsset,
        }),
    );
    actionsCallData.push(
        aaveV3CloseActionsEncoded.paybackAction({
            repayAmount: withdrawAmount ? repayAmount : MAXUINT,
        }),
    );
    actionsCallData.push(
        aaveV3CloseActionsEncoded.withdrawAction({
            withdrawAmount: withdrawAmount || MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(
        await aaveV3CloseActionsEncoded.sellAction({
            srcTokenInfo,
            destTokenInfo,
            swapAmount: withdrawAmount ? MAXUINT : swapAmount,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.sendRepayFL({ flAddr }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

    // price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));
    // gas price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        1,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(`GasUsed callAaveFLCloseToCollWithMaximumGasPriceStrategy: ${gasUsed}`);

    return receipt;
};

const callAaveFLCloseToCollStrategy = async (
    strategyExecutorByBot,
    subId,
    sub,
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

    actionsCallData.push(
        aaveV3CloseActionsEncoded.flAction({
            repayAmount,
            flAsset,
        }),
    );
    actionsCallData.push(
        aaveV3CloseActionsEncoded.paybackAction({
            repayAmount: withdrawAmount ? repayAmount : MAXUINT,
        }),
    );
    actionsCallData.push(
        aaveV3CloseActionsEncoded.withdrawAction({
            withdrawAmount: withdrawAmount || MAXUINT,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.feeTakingAction({ closeGasCost }));
    actionsCallData.push(
        await aaveV3CloseActionsEncoded.sellAction({
            srcTokenInfo,
            destTokenInfo,
            swapAmount: withdrawAmount ? MAXUINT : swapAmount,
        }),
    );
    actionsCallData.push(aaveV3CloseActionsEncoded.sendRepayFL({ flAddr }));
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());
    actionsCallData.push(aaveV3CloseActionsEncoded.sendAction());

    // price
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const receipt = await strategyExecutorByBot.executeStrategy(
        subId,
        1,
        triggerCallData,
        actionsCallData,
        sub,
        {
            gasLimit: 8000000,
        },
    );

    const gasUsed = await getGasUsed(receipt);

    console.log(`GasUsed callAaveFLCloseToCollStrategy: ${gasUsed}`);

    return receipt;
};

const callCurveUsdAdvancedRepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    repayAmount,
    additionalData,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const repayGasCost = 1000000; // .8 mil gas
    const curveUsdRepayAction = new dfs.actions.curveusd.CurveUsdRepayAction(
        nullAddress,
        repayAmount,
        nullAddress,
        0,
        additionalData,
        repayGasCost,
        400,
    );
    const curveUsdCollRatioCheck = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '0',
        '0',
        nullAddress,
    );
    actionsCallData.push(curveUsdRepayAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdCollRatioCheck.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callCurveUsdAdvancedRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callCurveUsdRepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    repayAmount,
    maxActiveBand,
    exchangeObject,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const repayGasCost = 1000000; // .8 mil gas
    const curveUsdWithdrawAction = new dfs.actions.curveusd.CurveUsdWithdrawAction(
        nullAddress,
        nullAddress,
        repayAmount,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        nullAddress,
        '0x000000000000000000000000000000000000dead',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, nullAddress, '0');
    const curveUsdPaybackAction = new dfs.actions.curveusd.CurveUsdPaybackAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        '0',
        maxActiveBand, // sent by backend
    );
    const curveUsdCollRatioCheck = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '0',
        '0',
        nullAddress,
    );
    actionsCallData.push(curveUsdWithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdPaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdCollRatioCheck.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callCurveUsdRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callCurveUsdFLRepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    repayAmount,
    collAddr,
    maxActiveBand,
    exchangeObject,
    flAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const repayGasCost = 1000000; // .8 mil gas

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collAddr], [repayAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        nullAddress,
        '0x000000000000000000000000000000000000dead',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, nullAddress, '0');
    const curveUsdPaybackAction = new dfs.actions.curveusd.CurveUsdPaybackAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        '0',
        maxActiveBand, // sent by backend
    );
    const curveUsdWithdrawAction = new dfs.actions.curveusd.CurveUsdWithdrawAction(
        nullAddress,
        flAddr,
        '0',
    );
    const curveUsdCollRatioCheck = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '0',
        '0',
        nullAddress,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdPaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdWithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdCollRatioCheck.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callCurveUsdFLRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callCurveUsdBoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    boostAmount,
    exchangeObject,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const boostGasCost = 1000000; // .8 mil gas

    const curveUsdBorrowAction = new dfs.actions.curveusd.CurveUsdBorrowAction(
        nullAddress,
        nullAddress,
        boostAmount,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        nullAddress, // piped
        '0x000000000000000000000000000000000000dead', // piped
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        boostGasCost, // sent by backend
        nullAddress, // taken from subdata
        '0', // output of sell action
    );
    const supplyAction = new dfs.actions.curveusd.CurveUsdSupplyAction(
        nullAddress,
        nullAddress,
        nullAddress,
        '0',
    );
    const curveUsdCollRatioCheckAction = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '0', // taken from subdata
        '0', // taken from subdata
        nullAddress, // taken from subdata
    );
    actionsCallData.push(curveUsdBorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdCollRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callCurveUsdBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callCurveUsdFLDebtBoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    boostAmount,
    exchangeObject,
    crvusdAddress,
    flActionAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const boostGasCost = 1000000; // .8 mil gas

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([crvusdAddress], [boostAmount]),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        nullAddress, // piped
        '0x000000000000000000000000000000000000dead', // piped
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        boostGasCost, // sent by backend
        nullAddress, // taken from subdata
        '0', // output of sell action
    );
    const curveUsdAdjustAction = new dfs.actions.curveusd.CurveUsdAdjustAction(
        nullAddress,
        nullAddress,
        flActionAddr,
        '0',
        '0',
    );
    const curveUsdCollRatioCheckAction = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '0', // taken from subdata
        '0', // taken from subdata
        nullAddress, // taken from subdata
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdAdjustAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdCollRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callCurveUsdFLDebtBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callCurveUsdFLCollBoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    boostAmount,
    exchangeObject,
    collAddress,
    flActionAddr,
    flAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const boostGasCost = 1000000; // .8 mil gas

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collAddress], [flAmount]),
    );
    const curveUsdAdjustAction = new dfs.actions.curveusd.CurveUsdAdjustAction(
        nullAddress,
        nullAddress,
        nullAddress,
        flAmount,
        boostAmount,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        nullAddress, // piped
        '0x000000000000000000000000000000000000dead', // piped
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        boostGasCost, // sent by backend
        nullAddress, // taken from subdata
        '0', // output of sell action
    );
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        [nullAddress, nullAddress],
        [flActionAddr, nullAddress],
        ['0', hre.ethers.constants.MaxUint256],
    );
    const curveUsdCollRatioCheckAction = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '0', // taken from subdata
        '0', // taken from subdata
        nullAddress, // taken from subdata
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdAdjustAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokensAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdCollRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callCurveUsdFLCollBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callCurveUsdPaybackStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    repayAmount,
    maxActiveBand,
    token,
    from,
) => {
    const actionsCallData = [];
    const repayGasCost = 1000000;

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        token,
        from,
        repayAmount, // sent by backend
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, nullAddress, '0');
    const curveUsdPaybackAction = new dfs.actions.curveusd.CurveUsdPaybackAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        '0',
        maxActiveBand, // sent by backend
    );
    actionsCallData.push(pullTokenAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(curveUsdPaybackAction.encodeForRecipe()[0]);

    const triggerCallData = [];
    const curveUsdHealthRatioTrigger = new dfs.triggers.CurveUsdHealthRatioTrigger(
        nullAddress,
        nullAddress,
        '0',
    );
    triggerCallData.push(curveUsdHealthRatioTrigger.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callCurveUsdPaybackStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callMorphoBlueBoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    boostAmount,
    exchangeObject,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const boostGasCost = 1000000;
    const borrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        boostAmount,
        nullAddress,
        nullAddress,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        nullAddress,
        '0x000000000000000000000000000000000000dead',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, nullAddress, '0');
    const supplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
        nullAddress,
        nullAddress,
    );
    const ratioCheck = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
    );
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(ratioCheck.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMorphoBlueBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callMorphoBlueFLCollBoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    collToken,
    flAmount,
    flAddress,
    boostAmount,
    exchangeObject,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const boostGasCost = 1000000;
    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [flAmount]),
    );

    const supplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        flAmount,
        nullAddress,
        nullAddress,
    );
    const borrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        boostAmount,
        nullAddress,
        nullAddress,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        nullAddress,
        '0x000000000000000000000000000000000000dead',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, nullAddress, '0');
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        [nullAddress, nullAddress],
        [flAddress, nullAddress], // first one sent by backend, second piped
        [0, hre.ethers.constants.MaxUint256], // first one piped to return fl, second one sent by backend
    );
    const ratioCheck = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokensAction.encodeForRecipe()[0]);
    actionsCallData.push(ratioCheck.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMorphoBlueFLCollBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callMorphoBlueFLDebtBoostStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    loanToken,
    boostAmount,
    flAddress,
    exchangeObject,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const boostGasCost = 1000000;
    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([loanToken], [boostAmount]),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        nullAddress,
        '0x000000000000000000000000000000000000dead',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, nullAddress, '0');
    const supplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
        nullAddress,
        nullAddress,
    );
    const borrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        boostAmount,
        nullAddress,
        flAddress,
    );
    const ratioCheck = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(ratioCheck.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMorphoBlueFLDebtBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callMorphoBlueRepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    repayAmount,
    exchangeObject,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const repayGasCost = 1000000;
    const withdraw = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        repayAmount,
        nullAddress,
        nullAddress,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        nullAddress,
        '0x000000000000000000000000000000000000dead',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, nullAddress, '0');
    const payback = new dfs.actions.morphoblue.MorphoBluePaybackAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
        nullAddress,
        nullAddress,
    );
    const ratioCheck = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
    );
    actionsCallData.push(withdraw.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(payback.encodeForRecipe()[0]);
    actionsCallData.push(ratioCheck.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMorphoBlueRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callMorphoBlueFLCollRepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    collToken,
    repayAmount,
    flAddress,
    exchangeObject,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const boostGasCost = 1000000;
    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [repayAmount]),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        nullAddress,
        '0x000000000000000000000000000000000000dead',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, nullAddress, '0');
    const supplyAction = new dfs.actions.morphoblue.MorphoBluePaybackAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
        nullAddress,
        nullAddress,
    );
    const borrowAction = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
        nullAddress,
        flAddress,
    );
    const ratioCheck = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(ratioCheck.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMorphoBlueFLCollRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callMorphoBlueFLDebtRepayStrategy = async (
    botAcc,
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    debtToken,
    flAmount,
    flAddress,
    repayAmount,
    exchangeObject,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const boostGasCost = 1000000;
    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([debtToken], [flAmount]),
    );

    const payback = new dfs.actions.morphoblue.MorphoBluePaybackAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        flAmount,
        nullAddress,
        nullAddress,
    );
    const withdraw = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        repayAmount,
        nullAddress,
        nullAddress,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        nullAddress,
        '0x000000000000000000000000000000000000dead',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, nullAddress, '0');
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        [nullAddress, nullAddress],
        [flAddress, nullAddress], // first one sent by backend, second piped
        [0, hre.ethers.constants.MaxUint256], // first one piped to return fl, second one sent by backend
    );
    const ratioCheck = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(payback.encodeForRecipe()[0]);
    actionsCallData.push(withdraw.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokensAction.encodeForRecipe()[0]);
    actionsCallData.push(ratioCheck.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [nullAddress, nullAddress, '0', '0'],
        ),
    );
    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
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
        `GasUsed callMorphoBlueFLDebtRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callAaveV3OpenOrderFromCollStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    borrowAmount,
    exchangeObject,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        false,
        placeHolderAddr,
        borrowAmount,
        placeHolderAddr,
        2,
        0,
        false,
        placeHolderAddr,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );

    let feeTakingAction;
    if (isL2) {
        feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
            gasCost,
            placeHolderAddr,
            '0',
            '0',
            '10000000',
        );
    } else {
        feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    }

    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        false,
        placeHolderAddr,
        0,
        placeHolderAddr,
        placeHolderAddr,
        0,
        true,
        false,
        placeHolderAddr,
    );
    const openRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        0,
        placeHolderAddr,
    );
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(openRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 1],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3OpenOrderFromCollStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callAaveV3FLOpenOrderFromCollStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    flAmount,
    exchangeObject,
    debtAsset,
    flAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([debtAsset], [flAmount]),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );

    let feeTakingAction;
    if (isL2) {
        feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
            gasCost,
            placeHolderAddr,
            '0',
            '0',
            '10000000',
        );
    } else {
        feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    }

    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        false,
        placeHolderAddr,
        0,
        placeHolderAddr,
        placeHolderAddr,
        0,
        true,
        false,
        placeHolderAddr,
    );
    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        false,
        placeHolderAddr,
        0,
        flAddress,
        2,
        0,
        false,
        placeHolderAddr,
    );
    const openRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        0,
        placeHolderAddr,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(openRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 1],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3FLOpenOrderFromCollStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callAaveV3FLOpenOrderFromDebtStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    flAmount,
    withdrawAmount,
    exchangeObject,
    debtAsset,
    flAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([debtAsset], [flAmount]),
    );

    const aaveV3WithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        false,
        placeHolderAddr,
        withdrawAmount,
        placeHolderAddr,
        0,
    );
    const sumInputsAction = new dfs.actions.basic.SumInputsAction(flAmount, 0);
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );

    let feeTakingAction;
    if (isL2) {
        feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
            gasCost,
            placeHolderAddr,
            '0',
            '0',
            '10000000',
        );
    } else {
        feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    }

    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        false,
        placeHolderAddr,
        0,
        placeHolderAddr,
        placeHolderAddr,
        0,
        true,
        false,
        placeHolderAddr,
    );
    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        false,
        placeHolderAddr,
        0,
        flAddress,
        2,
        0,
        false,
        placeHolderAddr,
    );
    const openRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        0,
        placeHolderAddr,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sumInputsAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(openRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 1],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3FLOpenOrderFromDebtStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callMorphoBlueBoostOnTargetPriceStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    borrowAmount,
    exchangeObject,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const borrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        borrowAmount,
        placeHolderAddr,
        placeHolderAddr,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const supplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        0,
        placeHolderAddr,
        placeHolderAddr,
    );
    const targetRatioCheckAction = new dfs.actions.checkers.MorphoBlueTargetRatioCheckAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        placeHolderAddr,
        0,
    );
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(targetRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callMorphoBlueBoostOnTargetPriceStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callMorphoBlueFLBoostOnTargetPriceStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    flAmount,
    exchangeObject,
    loanToken,
    flAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([loanToken], [flAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const supplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        0,
        placeHolderAddr,
        placeHolderAddr,
    );
    const borrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        0,
        placeHolderAddr,
        flAddress,
    );
    const targetRatioCheckAction = new dfs.actions.checkers.MorphoBlueTargetRatioCheckAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        placeHolderAddr,
        0,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(targetRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callMorphoBlueFLBoostOnTargetPriceStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callLiquityV2RepayStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const liquityV2WithdrawAction = new dfs.actions.liquityV2.LiquityV2WithdrawAction(
        placeHolderAddr,
        placeHolderAddr,
        0,
        repayAmount,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, 0);
    const liquityV2PaybackAction = new dfs.actions.liquityV2.LiquityV2PaybackAction(
        placeHolderAddr,
        placeHolderAddr,
        0,
        0,
    );
    const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
        placeHolderAddr,
        0,
        0,
        0,
    );
    actionsCallData.push(liquityV2WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2RatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(['address', 'uint256', 'uint256', 'uint8'], [placeHolderAddr, 0, 0, 0]),
    );
    const { callData, receipt } = await executeStrategy(
        false,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callLiquityV2RepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callLiquityV2FLRepayStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    collToken,
    flAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [repayAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, 0);
    const liquityV2AdjustAction = new dfs.actions.liquityV2.LiquityV2AdjustAction(
        placeHolderAddr,
        placeHolderAddr,
        flAddr,
        0,
        0,
        0,
        0,
        CollActionType.WITHDRAW,
        DebtActionType.PAYBACK,
    );
    const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
        placeHolderAddr,
        0,
        0,
        0,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2AdjustAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2RatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(['address', 'uint256', 'uint256', 'uint8'], [placeHolderAddr, 0, 0, 0]),
    );
    const { callData, receipt } = await executeStrategy(
        false,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callLiquityV2FLRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callLiquityV2BoostStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    maxUpFrontFee,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const liquityV2BorrowAction = new dfs.actions.liquityV2.LiquityV2BorrowAction(
        placeHolderAddr,
        placeHolderAddr,
        0,
        boostAmount,
        maxUpFrontFee,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, 0);
    const liquityV2SupplyAction = new dfs.actions.liquityV2.LiquityV2SupplyAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        0,
    );
    const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
        placeHolderAddr,
        0,
        0,
        0,
    );
    actionsCallData.push(liquityV2BorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2SupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2RatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(['address', 'uint256', 'uint256', 'uint8'], [placeHolderAddr, 0, 0, 0]),
    );
    const { callData, receipt } = await executeStrategy(
        false,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callLiquityV2BoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callLiquityV2FLBoostStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    boldToken,
    maxUpFrontFee,
    flAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([boldToken], [boostAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, 0);
    const liquityV2AdjustAction = new dfs.actions.liquityV2.LiquityV2AdjustAction(
        placeHolderAddr,
        placeHolderAddr,
        flAddr,
        0,
        0,
        0,
        maxUpFrontFee,
        0,
        0,
    );
    const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
        placeHolderAddr,
        0,
        0,
        0,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2AdjustAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2RatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(['address', 'uint256', 'uint256', 'uint8'], [placeHolderAddr, 0, 0, 0]),
    );
    const { callData, receipt } = await executeStrategy(
        false,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callLiquityV2FLBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callLiquityV2FLBoostWithCollStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmountInColl,
    boldAmount,
    collToken,
    maxUpFrontFee,
    flAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [boostAmountInColl]),
    );
    const liquityV2AdjustAction = new dfs.actions.liquityV2.LiquityV2AdjustAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        boostAmountInColl,
        boldAmount,
        maxUpFrontFee,
        0,
        0,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, 0);
    const liquityV2SupplyAction = new dfs.actions.liquityV2.LiquityV2SupplyAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        0,
    );
    const liquityV2WithdrawAction = new dfs.actions.liquityV2.LiquityV2WithdrawAction(
        placeHolderAddr,
        flAddr,
        0,
        0,
    );
    const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
        placeHolderAddr,
        0,
        0,
        0,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2AdjustAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2SupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2RatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(['address', 'uint256', 'uint256', 'uint8'], [placeHolderAddr, 0, 0, 0]),
    );
    const { callData, receipt } = await executeStrategy(
        false,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callLiquityV2FLBoostWithCollStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callLiquityV2CloseToCollStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    withdrawCollAmount,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const liquityV2WithdrawAction = new dfs.actions.liquityV2.LiquityV2WithdrawAction(
        placeHolderAddr,
        placeHolderAddr,
        0,
        withdrawCollAmount,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const liquityV2CloseAction = new dfs.actions.liquityV2.LiquityV2CloseAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, 0);
    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        [placeHolderAddr, placeHolderAddr, placeHolderAddr],
        [placeHolderAddr, placeHolderAddr, placeHolderAddr],
        [
            hre.ethers.utils.parseEther('0.0375'),
            hre.ethers.constants.MaxUint256,
            hre.ethers.constants.MaxUint256,
        ],
    );
    actionsCallData.push(liquityV2WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2CloseAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokensAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(['address', 'uint256', 'uint256'], [placeHolderAddr, 0, 0]),
    );
    const { callData, receipt } = await executeStrategy(
        false,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callLiquityV2CloseToCollStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callLiquityV2FLCloseToCollStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    flAmount,
    flAddr,
    collToken,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [flAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const liquityV2CloseAction = new dfs.actions.liquityV2.LiquityV2CloseAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, 0);
    const sendTokenActionForFlashloan = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr,
        flAddr,
        0,
    );
    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        [placeHolderAddr, placeHolderAddr, placeHolderAddr],
        [placeHolderAddr, placeHolderAddr, placeHolderAddr],
        [
            hre.ethers.utils.parseEther('0.0375'),
            hre.ethers.constants.MaxUint256,
            hre.ethers.constants.MaxUint256,
        ],
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2CloseAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenActionForFlashloan.encodeForRecipe()[0]);
    actionsCallData.push(sendTokensAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(['address', 'uint256', 'uint256'], [placeHolderAddr, 0, 0]),
    );
    const { callData, receipt } = await executeStrategy(
        false,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callLiquityV2FLCloseToCollStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callLiquityV2FLCloseToDebtStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    flAmount,
    flAddr,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([BOLD_ADDR], [flAmount]),
    );
    const liquityV2CloseAction = new dfs.actions.liquityV2.LiquityV2CloseAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, 0);
    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        [placeHolderAddr, placeHolderAddr, placeHolderAddr],
        [flAddr, placeHolderAddr, placeHolderAddr],
        [0, hre.ethers.constants.MaxUint256, hre.ethers.utils.parseEther('0.0375')],
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2CloseAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokensAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(['address', 'uint256', 'uint256'], [placeHolderAddr, 0, 0]),
    );
    const { callData, receipt } = await executeStrategy(
        false,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callLiquityV2FLCloseToDebtStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callLiquityV2InterestRateAdjustmentStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    newInterestRate,
    upperHint,
    lowerHint,
    maxUpfrontFee,
) => {
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const liquityV2AdjustInterestRateAction =
        new dfs.actions.liquityV2.LiquityV2AdjustInterestRateAction(
            placeHolderAddr, // market
            0, // troveId
            newInterestRate,
            upperHint,
            lowerHint,
            maxUpfrontFee,
        );

    const liquityV2NewInterestRateCheckerAction =
        new dfs.actions.checkers.LiquityV2NewInterestRateCheckerAction(
            placeHolderAddr, // market
            0, // troveId
            0, // interestRateChange
        );

    actionsCallData.push(liquityV2AdjustInterestRateAction.encodeForRecipe()[0]);
    actionsCallData.push(liquityV2NewInterestRateCheckerAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(['address', 'uint256', 'uint256', 'uint256'], [placeHolderAddr, 0, 0, 0]),
    );
    const { callData, receipt } = await executeStrategy(
        false,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callLiquityV2InterestRateAdjustmentStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callFluidT1RepayStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    debtToken,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const fluidT1WithdrawAction = new dfs.actions.fluid.FluidVaultT1WithdrawAction(
        placeHolderAddr,
        0,
        repayAmount,
        placeHolderAddr,
        true,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, debtToken, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, debtToken, '0');
    const fluidT1PaybackAction = new dfs.actions.fluid.FluidVaultT1PaybackAction(
        placeHolderAddr,
        0,
        0,
        placeHolderAddr,
    );
    const fluidRatioCheckAction = new dfs.actions.checkers.FluidRatioCheckAction(0, 0, 0);
    actionsCallData.push(fluidT1WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(fluidT1PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(fluidRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(abiCoder.encode(['uint256', 'uint256', 'uint8'], [0, 0, 0]));
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callFluidT1RepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callFluidT1FLRepayStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    collToken,
    debtToken,
    flAddr,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [repayAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, debtToken, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, debtToken, '0');
    const fluidT1AdjustAction = new dfs.actions.fluid.FluidVaultT1AdjustAction(
        placeHolderAddr,
        0,
        0,
        0,
        placeHolderAddr,
        flAddr,
        true,
        0,
        0,
    );
    const fluidRatioCheckAction = new dfs.actions.checkers.FluidRatioCheckAction(0, 0, 0);
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(fluidT1AdjustAction.encodeForRecipe()[0]);
    actionsCallData.push(fluidRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(abiCoder.encode(['uint256', 'uint256', 'uint8'], [0, 0, 0]));
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callFluidT1FLRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callFluidT1BoostStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    collToken,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const fluidT1BorrowAction = new dfs.actions.fluid.FluidVaultT1BorrowAction(
        placeHolderAddr,
        0,
        boostAmount,
        placeHolderAddr,
        true,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, collToken, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, collToken, '0');
    const fluidT1SupplyAction = new dfs.actions.fluid.FluidVaultT1SupplyAction(
        placeHolderAddr,
        0,
        0,
        placeHolderAddr,
    );
    const fluidRatioCheckAction = new dfs.actions.checkers.FluidRatioCheckAction(0, 0, 0);
    actionsCallData.push(fluidT1BorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(fluidT1SupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(fluidRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(abiCoder.encode(['uint256', 'uint256', 'uint8'], [0, 0, 0]));
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callFluidT1BoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callFluidT1FLBoostStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    collToken,
    debtToken,
    flAddr,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([debtToken], [boostAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, collToken, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, collToken, '0');
    const fluidT1AdjustAction = new dfs.actions.fluid.FluidVaultT1AdjustAction(
        placeHolderAddr,
        0,
        0,
        0,
        placeHolderAddr,
        flAddr,
        true,
        0,
        0,
    );
    const fluidRatioCheckAction = new dfs.actions.checkers.FluidRatioCheckAction(0, 0, 0);
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(fluidT1AdjustAction.encodeForRecipe()[0]);
    actionsCallData.push(fluidRatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(abiCoder.encode(['uint256', 'uint256', 'uint8'], [0, 0, 0]));
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callFluidT1FLBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callCompV3RepayStrategyTemplate = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    isOnPriceStrategy,
    collAssetAddr = placeHolderAddr,
    positionOwner = placeHolderAddr,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const user = isOnPriceStrategy ? placeHolderAddr : positionOwner;

    const compV3WithdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        placeHolderAddr,
        placeHolderAddr,
        collAssetAddr,
        repayAmount,
        user,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const compV3PaybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        placeHolderAddr,
        0,
        placeHolderAddr,
        user,
        placeHolderAddr,
    );
    const compV3RatioCheckAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        0,
        0,
        placeHolderAddr,
        user,
    );
    actionsCallData.push(compV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3RatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed ${
            isOnPriceStrategy ? 'callCompV3RepayOnPriceStrategy' : 'callCompV3RepayStrategy'
        }: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callCompV3FLRepayStrategyTemplate = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    flAddr,
    collToken,
    isOnPriceStrategy,
    positionOwner = placeHolderAddr,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const user = isOnPriceStrategy ? placeHolderAddr : positionOwner;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [repayAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const compV3PaybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        placeHolderAddr,
        0,
        placeHolderAddr,
        user,
        placeHolderAddr,
    );
    const compV3WithdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        placeHolderAddr,
        flAddr,
        collToken,
        0,
        user,
    );
    const compV3RatioCheckAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        0,
        0,
        placeHolderAddr,
        user,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3RatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed ${
            isOnPriceStrategy ? 'callCompV3FLRepayOnPriceStrategy' : 'callCompV3FLRepayStrategy'
        }: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callCompV3BoostStrategyTemplate = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    isOnPriceStrategy,
    collAssetAddr = placeHolderAddr,
    positionOwner = placeHolderAddr,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const user = isOnPriceStrategy ? placeHolderAddr : positionOwner;

    const compV3BorrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
        placeHolderAddr,
        boostAmount,
        placeHolderAddr,
        user,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, collAssetAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, collAssetAddr, '0');
    const compV3SupplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        placeHolderAddr,
        collAssetAddr,
        0,
        placeHolderAddr,
        user,
    );
    const compV3RatioCheckAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        0,
        0,
        placeHolderAddr,
        user,
    );
    actionsCallData.push(compV3BorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3SupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3RatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed ${
            isOnPriceStrategy ? 'callCompV3BoostOnPriceStrategy' : 'callCompV3BoostStrategy'
        }: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callCompV3FLBoostStrategyTemplate = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    flAddr,
    debtToken,
    isOnPriceStrategy,
    collAssetAddr = placeHolderAddr,
    positionOwner = placeHolderAddr,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const user = isOnPriceStrategy ? placeHolderAddr : positionOwner;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([debtToken], [boostAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, collAssetAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, collAssetAddr, '0');
    const compV3SupplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        placeHolderAddr,
        collAssetAddr,
        0,
        placeHolderAddr,
        user,
    );
    const compV3BorrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
        placeHolderAddr,
        0,
        flAddr,
        user,
    );
    const compV3RatioCheckAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        0,
        0,
        placeHolderAddr,
        user,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3SupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3BorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3RatioCheckAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed ${
            isOnPriceStrategy ? 'callCompV3FLBoostOnPriceStrategy' : 'callCompV3FLBoostStrategy'
        }: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callCompV3RepayStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    collAssetAddr,
    positionOwner,
) => {
    const isOnPriceStrategy = false;
    await callCompV3RepayStrategyTemplate(
        strategyExecutor,
        strategyIndex,
        subId,
        strategySub,
        exchangeObject,
        repayAmount,
        isOnPriceStrategy,
        collAssetAddr,
        positionOwner,
    );
};
const callCompV3FLRepayStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    flAddr,
    collToken,
    positionOwner = placeHolderAddr,
) => {
    const isOnPriceStrategy = false;
    await callCompV3FLRepayStrategyTemplate(
        strategyExecutor,
        strategyIndex,
        subId,
        strategySub,
        exchangeObject,
        repayAmount,
        flAddr,
        collToken,
        isOnPriceStrategy,
        positionOwner,
    );
};

const callCompV3BoostStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    collAssetAddr,
    positionOwner,
) => {
    const isOnPriceStrategy = false;
    await callCompV3BoostStrategyTemplate(
        strategyExecutor,
        strategyIndex,
        subId,
        strategySub,
        exchangeObject,
        boostAmount,
        isOnPriceStrategy,
        collAssetAddr,
        positionOwner,
    );
};
const callCompV3FLBoostStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    flAddr,
    debtToken,
    collAssetAddr,
    positionOwner,
) => {
    const isOnPriceStrategy = false;
    await callCompV3FLBoostStrategyTemplate(
        strategyExecutor,
        strategyIndex,
        subId,
        strategySub,
        exchangeObject,
        boostAmount,
        flAddr,
        debtToken,
        isOnPriceStrategy,
        collAssetAddr,
        positionOwner,
    );
};

const callCompV3RepayOnPriceStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
) => {
    const isOnPriceStrategy = true;
    await callCompV3RepayStrategyTemplate(
        strategyExecutor,
        strategyIndex,
        subId,
        strategySub,
        exchangeObject,
        repayAmount,
        isOnPriceStrategy,
    );
};
const callCompV3FLRepayOnPriceStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    flAddr,
    collToken,
) => {
    const isOnPriceStrategy = true;
    await callCompV3FLRepayStrategyTemplate(
        strategyExecutor,
        strategyIndex,
        subId,
        strategySub,
        exchangeObject,
        repayAmount,
        flAddr,
        collToken,
        isOnPriceStrategy,
    );
};

const callCompV3BoostOnPriceStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
) => {
    const isOnPriceStrategy = true;
    await callCompV3BoostStrategyTemplate(
        strategyExecutor,
        strategyIndex,
        subId,
        strategySub,
        exchangeObject,
        boostAmount,
        isOnPriceStrategy,
    );
};
const callCompV3FLBoostOnPriceStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    flAddr,
    debtToken,
) => {
    const isOnPriceStrategy = true;
    await callCompV3FLBoostStrategyTemplate(
        strategyExecutor,
        strategyIndex,
        subId,
        strategySub,
        exchangeObject,
        boostAmount,
        flAddr,
        debtToken,
        isOnPriceStrategy,
    );
};

const callCompV3FLCloseToCollStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    flAmount,
    flAddr,
    collToken,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [flAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const compV3PaybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        placeHolderAddr,
        0,
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
    );
    const compV3WithdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        [placeHolderAddr, placeHolderAddr, placeHolderAddr],
        [flAddr, placeHolderAddr, placeHolderAddr],
        [0, hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokensAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint256'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callCompV3FLCloseToCollStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callCompV3FLCloseToDebtStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    flAmount,
    flAddr,
    debtToken,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([debtToken], [flAmount]),
    );
    const compV3PaybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        placeHolderAddr,
        flAmount.toString(),
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
    );
    const compV3WithdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
        placeHolderAddr,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        [placeHolderAddr, placeHolderAddr],
        [flAddr, placeHolderAddr],
        [0, hre.ethers.constants.MaxUint256],
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(compV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokensAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint256'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callCompV3FLCloseToDebtStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3GenericBoostStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    marketAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const debtTokenAddr = exchangeObject[0]; // srcAddr in exchange object is the debt token
    const debtAssetId = (await getAaveV3ReserveData(debtTokenAddr, marketAddress)).id;

    // Get collateral asset ID from exchange object (destAddr should be the collateral token we're supplying)
    const collTokenAddr = exchangeObject[1]; // destAddr in exchange object is the collateral token
    const collAssetId = (await getAaveV3ReserveData(collTokenAddr, marketAddress)).id;

    console.log(`Using debt asset ID: ${debtAssetId} for token: ${debtTokenAddr}`);
    console.log(`Using collateral asset ID: ${collAssetId} for token: ${collTokenAddr}`);

    const aaveV3BorrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        false,
        placeHolderAddr,
        boostAmount,
        placeHolderAddr,
        2,
        debtAssetId, // Use correct debt asset ID
        true, // useOnBehalf
        placeHolderAddr,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );

    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, exchangeObject[1], '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, exchangeObject[1], '0');
    const aaveV3SupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        false, // useDefaultMarket
        placeHolderAddr, // market
        0, // amount
        placeHolderAddr, // from
        collTokenAddr, // tokenAddr (collateral token - WBTC)
        collAssetId, // assetId (calculated from WBTC)
        true, // enableAsColl
        true, // useOnBehalf
        placeHolderAddr, // onBehalf
    );
    const aaveV3RatioCheckAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        0, // checkBoostState
        0, // targetRatio (placeholder)
        placeHolderAddr,
        placeHolderAddr,
    );

    actionsCallData.push(aaveV3BorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3SupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3RatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3GenericFLBoostStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    flAddr,
    debtToken,
    collToken,
    marketAddr,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([debtToken], [boostAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, collToken, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, collToken, '0');

    const collAssetId = (await getAaveV3ReserveData(collToken, marketAddr)).id;

    console.log(
        `FL Using collateral asset ID: ${collAssetId} for token: ${collToken} on market: ${marketAddr}`,
    );

    const aaveV3SupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        false, // useDefaultMarket
        placeHolderAddr, // market
        0, // amount
        placeHolderAddr, // from
        collToken, // tokenAddr (collateral token)
        collAssetId, // assetId (calculated from collateral token)
        true, // enableAsColl
        true, // useOnBehalf
        placeHolderAddr, // onBehalf
    );
    // Get debt asset ID for FL version
    const debtAssetId = (await getAaveV3ReserveData(debtToken, marketAddr)).id;

    console.log(
        `FL Using debt asset ID: ${debtAssetId} for token: ${debtToken} on market: ${marketAddr}`,
    );

    const aaveV3BorrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        false,
        placeHolderAddr,
        0,
        flAddr,
        2,
        debtAssetId, // Use correct debt asset ID
        true, // useOnBehalf
        placeHolderAddr,
    );
    const aaveV3RatioCheckAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        0, // checkBoostState
        0, // targetRatio (placeholder)
        placeHolderAddr,
        placeHolderAddr,
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3SupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3BorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3RatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericFLBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3GenericRepayStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    marketAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const collTokenAddr = exchangeObject[0]; // srcAddr in exchange object is the collateral token
    const collAssetId = (await getAaveV3ReserveData(collTokenAddr, marketAddress)).id;

    const debtTokenAddr = exchangeObject[1]; // destAddr in exchange object is the debt token
    const debtAssetId = (await getAaveV3ReserveData(debtTokenAddr, marketAddress)).id;

    console.log(
        `Using collateral asset ID: ${collAssetId} for token: ${collTokenAddr} on market: ${marketAddress}`,
    );
    console.log(
        `Using debt asset ID: ${debtAssetId} for token: ${debtTokenAddr} on market: ${marketAddress}`,
    );

    // Get aToken address for collateral token (needed for PullTokenAction)
    const aTokenAddr = (await getAaveV3ReserveData(collTokenAddr, marketAddress)).aTokenAddress;
    console.log(
        `Using aToken address: ${aTokenAddr} for collateral token: ${collTokenAddr} on market: ${marketAddress}`,
    );

    // Pull aTokens from EOA to Smart Wallet before withdraw
    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        aTokenAddr,
        placeHolderAddr, // from (EOA address)
        repayAmount, // amount to pull
    );

    const aaveV3WithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        false, // use default market
        placeHolderAddr, // market
        0,
        placeHolderAddr, // to
        collAssetId, // assetId
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, exchangeObject[1], '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, exchangeObject[1], '0');
    const aaveV3PaybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        false,
        placeHolderAddr, // market
        0, // amount
        placeHolderAddr, // from
        2, // rate mode
        debtTokenAddr, // tokenAddr
        debtAssetId, // assetId
        true, // useOnBehalf
        placeHolderAddr, // onBehalfAddr
    );
    const aaveV3RatioCheckAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        0,
        0,
        placeHolderAddr,
        placeHolderAddr,
    );

    actionsCallData.push(pullTokenAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3RatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3GenericFLRepayStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    flAddr,
    marketAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const collToken = exchangeObject[0];
    const debtToken = exchangeObject[1];

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [repayAmount]),
    );

    const collAssetId = (await getAaveV3ReserveData(collToken, marketAddress)).id;
    const debtAssetId = (await getAaveV3ReserveData(debtToken, marketAddress)).id;

    // Get aToken address for collateral token (needed for PullTokenAction)
    const aTokenAddr = (await getAaveV3ReserveData(collToken, marketAddress)).aTokenAddress;
    console.log(
        `Using aToken address: ${aTokenAddr} for collateral token: ${collToken} on market: ${marketAddress}`,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, debtToken, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, debtToken, '0');

    const aaveV3PaybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        false,
        placeHolderAddr,
        0,
        placeHolderAddr,
        2,
        debtToken,
        debtAssetId, // debtAssetId
        true,
        placeHolderAddr,
    );

    // Pull aTokens from EOA to Smart Wallet before withdraw
    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        aTokenAddr,
        placeHolderAddr, // from (EOA address)
        0, // amount to pull
    );
    const aaveV3WithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        false,
        placeHolderAddr,
        0,
        flAddr,
        collAssetId, // assetId
    );

    const aaveV3RatioCheckAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        0, // checkBoostState
        0, // targetRatio (placeholder)
        placeHolderAddr,
        placeHolderAddr,
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(pullTokenAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3RatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericFLRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3GenericBoostOnPriceStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const aaveV3BorrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        false, // useDefaultMarket
        placeHolderAddr, // marketAddr
        boostAmount, // amount
        placeHolderAddr, // to
        2, // rateMode (VARIABLE)
        0, // debt asset ID - will use from subData
        true, // useOnBehalf
        placeHolderAddr,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );

    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const aaveV3SupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        false, // useDefaultMarket
        placeHolderAddr, // market
        0, // amount
        placeHolderAddr, // from
        placeHolderAddr, // tokenAddr (collateral token)
        0, // assetId - will use from subData
        true, // enableAsColl
        true, // useOnBehalf
        placeHolderAddr, // onBehalf
    );
    const aaveV3OpenRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        0, // targetRatio (placeholder)
        placeHolderAddr, // marketAddr
        placeHolderAddr, // user
    );

    actionsCallData.push(aaveV3BorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3SupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3OpenRatioCheckAction.encodeForRecipe()[0]);

    // Price trigger data - different from ratio trigger
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericBoostOnPriceStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3GenericFLBoostOnPriceStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    boostAmount,
    flAddr,
    debtToken,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([debtToken], [boostAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');

    const aaveV3SupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        false, // useDefaultMarket
        placeHolderAddr, // market
        0, // amount
        placeHolderAddr, // from
        placeHolderAddr, // collTokenAddr -  from subData
        0, // assetId - from subData
        true, // enableAsColl
        true, // useOnBehalf
        placeHolderAddr, // onBehalf
    );

    const aaveV3BorrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        false, // useDefaultMarket
        placeHolderAddr, // marketAddr
        0, // amount (from FL)
        flAddr, // onBehalf (FL address)
        2, // rateMode (VARIABLE)
        0, // assetId - from subData
        true, // useOnBehalf
        placeHolderAddr, // onBehalfAddr
    );

    const aaveV3OpenRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        0, // targetRatio (placeholder)
        placeHolderAddr, // marketAddr
        placeHolderAddr, // onBehalfAddr
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3SupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3BorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3OpenRatioCheckAction.encodeForRecipe()[0]);

    // Price trigger data - different from ratio trigger
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericFLBoostOnPriceStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3GenericRepayOnPriceStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    marketAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const collTokenAddr = exchangeObject[0];
    const aCollTokenAddr = (await getAaveV3ReserveData(collTokenAddr, marketAddress)).aTokenAddress;
    // Pull aTokens from EOA to Smart Wallet before withdraw
    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        aCollTokenAddr,
        placeHolderAddr, // from (EOA address)
        repayAmount, // amount to pull
    );

    const aaveV3WithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        false, // use default market
        placeHolderAddr, // market
        0,
        placeHolderAddr, // to
        0, // assetId - will be from subData
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const aaveV3PaybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        false,
        placeHolderAddr, // market
        0, // amount
        placeHolderAddr, // from
        2, // rate mode
        placeHolderAddr, // tokenAddr
        0, // assetId
        true, // useOnBehalf
        placeHolderAddr, // onBehalfAddr
    );
    const aaveV3OpenRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        0,
        placeHolderAddr,
        placeHolderAddr,
    );

    actionsCallData.push(pullTokenAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3OpenRatioCheckAction.encodeForRecipe()[0]);

    // Price trigger data - different from ratio trigger
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericBoostOnPriceStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3GenericFLRepayOnPriceStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    repayAmount,
    flAddr,
    marketAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const collToken = exchangeObject[0];

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [repayAmount]),
    );

    // Get aToken address for collateral token (needed for PullTokenAction)
    const aTokenAddr = (await getAaveV3ReserveData(collToken, marketAddress)).aTokenAddress;
    console.log(`Using aToken address: ${aTokenAddr} for collateral token: ${collToken}`);

    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');

    const aaveV3PaybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        false,
        placeHolderAddr,
        0,
        placeHolderAddr,
        2,
        placeHolderAddr, // debtAsset
        0, // debtAssetId
        true,
        placeHolderAddr,
    );

    // Pull aTokens from EOA to Smart Wallet before withdraw
    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        aTokenAddr,
        placeHolderAddr, // from (EOA address)
        0, // amount to pull
    );
    const aaveV3WithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        false,
        placeHolderAddr,
        0,
        flAddr,
        0, // collAssetId
    );

    const aaveV3OpenRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        0, // targetRatio (placeholder)
        placeHolderAddr,
        placeHolderAddr,
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(pullTokenAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3OpenRatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericFLRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3GenericFLCloseToDebtStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    flAmount,
    flAddr,
    marketAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const collToken = exchangeObject[0];
    const debtToken = exchangeObject[1];

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([debtToken], [flAmount]),
    );

    const aaveV3PaybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        false,
        placeHolderAddr,
        MAX_UINT,
        placeHolderAddr,
        2,
        placeHolderAddr, // debtAsset
        0, // debtAssetId
        true,
        placeHolderAddr,
    );

    // Get aToken address for collateral token (needed for PullTokenAction)
    const aTokenAddr = (await getAaveV3ReserveData(collToken, marketAddress)).aTokenAddress;
    console.log(`Using aToken address: ${aTokenAddr} for collateral token: ${collToken}`);

    // Pull aTokens from EOA to Smart Wallet before withdraw
    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        aTokenAddr,
        placeHolderAddr, // from (EOA address)
        MAX_UINT, // amount to pull
    );
    const aaveV3WithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        false,
        placeHolderAddr,
        0,
        placeHolderAddr,
        0, // collAssetId
    );

    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');

    const sendTokenToFLAction = new dfs.actions.basic.SendTokenAction(placeHolderAddr, flAddr, 0);
    const sendTokenToEOAAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(pullTokenAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenToFLAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenToEOAAction.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint256'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericFLRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3GenericFLCloseToCollStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    flAmount,
    flAddr,
    marketAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const collToken = exchangeObject[0];

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [flAmount]),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );

    const aaveV3PaybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        false,
        placeHolderAddr,
        MAX_UINT,
        placeHolderAddr,
        2,
        placeHolderAddr, // debtAsset
        0, // debtAssetId
        true,
        placeHolderAddr,
    );

    // Get aToken address for collateral token (needed for PullTokenAction)
    const aTokenAddr = (await getAaveV3ReserveData(collToken, marketAddress)).aTokenAddress;
    console.log(`Using aToken address: ${aTokenAddr} for collateral token: ${collToken}`);

    // Pull aTokens from EOA to Smart Wallet before withdraw
    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        aTokenAddr,
        placeHolderAddr, // from (EOA address)
        MAX_UINT, // amount to pull
    );
    const aaveV3WithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        false,
        placeHolderAddr,
        0,
        placeHolderAddr,
        0, // collAssetId
    );

    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');

    const sendTokenToFLAction = new dfs.actions.basic.SendTokenAction(placeHolderAddr, flAddr, 0);

    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        [placeHolderAddr, placeHolderAddr],
        [placeHolderAddr, placeHolderAddr],
        [hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3PaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(pullTokenAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenToFLAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokensAction.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint256'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericFLRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3BoostStrategy = async (
    strategyExecutor,
    subId,
    collAddr,
    debtAddr,
    collAssetId,
    debtAssetId,
    boostAmount,
    strategyIndex,
    boostSub,
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
            boostAmount,
            addrs[network].UNISWAP_V3_WRAPPER,
            0,
            3000,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const boostGasCost = 1_000_000; // 1 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(boostGasCost, collAddr, '0', '0');

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

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const isL2 = network !== 'mainnet';
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        boostSub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(boostGasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3OldBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3FLBoostStrategy = async (
    strategyExecutor,
    subId,
    collAddr,
    debtAddr,
    collAssetId,
    debtAssetId,
    boostAmount,
    strategyIndex,
    boostSub,
    flAddr,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    console.log('=== callAaveV3FLBoostStrategy Debug ===');
    console.log('collAddr:', collAddr);
    console.log('debtAddr:', debtAddr);
    console.log('collAssetId:', collAssetId);
    console.log('debtAssetId:', debtAssetId);
    console.log('boostAmount (debt amount):', boostAmount.toString());
    console.log('flAddr:', flAddr);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([debtAddr], [boostAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            debtAddr,
            collAddr,
            boostAmount,
            addrs[network].UNISWAP_V3_WRAPPER,
            0,
            3000,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, collAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, collAddr, '0');

    console.log(
        `FL Using collateral asset ID: ${collAssetId} for token: ${collAddr} on market: true`,
    );

    const aaveV3SupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        false, // useDefaultMarket
        placeHolderAddr, // market
        0, // amount
        placeHolderAddr, // from
        collAddr, // tokenAddr (collateral token)
        collAssetId, // assetId (calculated from collateral token)
        true, // enableAsColl
        true, // useOnBehalf
        placeHolderAddr, // onBehalf
    );

    console.log(`FL Using debt asset ID: ${debtAssetId} for token: ${debtAddr} on market: default`);

    const aaveV3BorrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        true,
        placeHolderAddr,
        0,
        flAddr,
        2,
        debtAssetId, // Use correct debt asset ID
        true, // useOnBehalf
        placeHolderAddr,
    );
    const aaveV3RatioCheckAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        0, // checkBoostState
        0, // targetRatio (placeholder)
        placeHolderAddr,
        placeHolderAddr,
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3SupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3BorrowAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3RatioCheckAction.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        false,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        boostSub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericFLBoostStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callAaveV3FLCollateralSwitchStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    flAmount,
    exchangeObject,
    fromAsset,
    flAddr,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([fromAsset], [flAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const aaveV3SupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        false,
        placeHolderAddr,
        0,
        placeHolderAddr,
        placeHolderAddr,
        0,
        true,
        false,
        placeHolderAddr,
    );
    const aaveV3WithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        false,
        placeHolderAddr,
        0,
        placeHolderAddr,
        0,
    );
    const returnFLAction = new dfs.actions.basic.SendTokenAction(placeHolderAddr, flAddr, 0);
    const returnAnyDust = new dfs.actions.basic.SendTokenAndUnwrapAction(
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3SupplyAction.encodeForRecipe()[0]);
    actionsCallData.push(aaveV3WithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(returnFLAction.encodeForRecipe()[0]);
    actionsCallData.push(returnAnyDust.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint8'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3FLCollateralSwitchStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callSparkGenericFLCloseToDebtStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    flAmount,
    flAddr,
    marketAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const collToken = exchangeObject[0];
    const debtToken = exchangeObject[1];

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([debtToken], [flAmount]),
    );

    const sparkPaybackAction = new dfs.actions.spark.SparkPaybackAction(
        false,
        placeHolderAddr,
        MAX_UINT,
        placeHolderAddr,
        2,
        placeHolderAddr,
        0,
        true,
        placeHolderAddr,
    );

    // Get aToken address for collateral token (needed for PullTokenAction)
    const aTokenAddr = (await getAaveV3ReserveData(collToken, marketAddress)).aTokenAddress;
    console.log(`Using aToken address: ${aTokenAddr} for collateral token: ${collToken}`);

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        aTokenAddr,
        placeHolderAddr,
        MAX_UINT,
    );
    const sparkWithdrawAction = new dfs.actions.spark.SparkWithdrawAction(
        false,
        placeHolderAddr,
        0,
        placeHolderAddr,
        0,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');

    const sendTokenToFLAction = new dfs.actions.basic.SendTokenAction(placeHolderAddr, flAddr, 0);
    const sendTokenToEOAAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sparkPaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(pullTokenAction.encodeForRecipe()[0]);
    actionsCallData.push(sparkWithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenToFLAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenToEOAAction.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint256'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callSparkGenericFLCloseToDebtStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

const callSparkGenericFLCloseToCollStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    flAmount,
    flAddr,
    marketAddress,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const collToken = exchangeObject[0];

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [flAmount]),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );

    const sparkPaybackAction = new dfs.actions.spark.SparkPaybackAction(
        false,
        placeHolderAddr,
        MAX_UINT,
        placeHolderAddr,
        2,
        placeHolderAddr,
        0,
        true,
        placeHolderAddr,
    );

    // Get aToken address for collateral token (needed for PullTokenAction)
    const aTokenAddr = (await getAaveV3ReserveData(collToken, marketAddress)).aTokenAddress;
    console.log(`Using aToken address: ${aTokenAddr} for collateral token: ${collToken}`);

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        aTokenAddr,
        placeHolderAddr,
        MAX_UINT,
    );
    const sparkWithdrawAction = new dfs.actions.spark.SparkWithdrawAction(
        false,
        placeHolderAddr,
        0,
        placeHolderAddr,
        0,
    );

    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');

    const sendTokenToFLAction = new dfs.actions.basic.SendTokenAction(placeHolderAddr, flAddr, 0);

    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        [placeHolderAddr, placeHolderAddr],
        [placeHolderAddr, placeHolderAddr],
        [hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
    );

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(sparkPaybackAction.encodeForRecipe()[0]);
    actionsCallData.push(pullTokenAction.encodeForRecipe()[0]);
    actionsCallData.push(sparkWithdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenToFLAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokensAction.encodeForRecipe()[0]);

    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'uint256', 'uint256'],
            [placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );

    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );

    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callAaveV3GenericFLRepayStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callMorphoBlueFLCloseToCollStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    collToken,
    flAmount,
    flAddress,
    collAmount,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([collToken], [flAmount]),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const morphoPayback = new dfs.actions.morphoblue.MorphoBluePaybackAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        hre.ethers.constants.MaxUint256,
        placeHolderAddr,
        placeHolderAddr,
    );
    const morphoWithdrawCollateral = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        collAmount,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const sendTokenToFlAction = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr,
        flAddress,
        0,
    );
    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        [placeHolderAddr, placeHolderAddr],
        [placeHolderAddr, placeHolderAddr],
        [hre.ethers.constants.MaxUint256, hre.ethers.constants.MaxUint256],
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(morphoPayback.encodeForRecipe()[0]);
    actionsCallData.push(morphoWithdrawCollateral.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenToFlAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokensAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'address', 'uint256', 'uint256'],
            [placeHolderAddr, placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callMorphoBlueFLCloseToCollStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};
const callMorphoBlueFLCloseToDebtStrategy = async (
    strategyExecutor,
    strategyIndex,
    subId,
    strategySub,
    exchangeObject,
    loanToken,
    flAmount,
    flAddress,
    collAmount,
) => {
    const isL2 = network !== 'mainnet';
    const triggerCallData = [];
    const actionsCallData = [];
    const gasCost = 1000000;
    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([loanToken], [flAmount]),
    );
    const morphoPayback = new dfs.actions.morphoblue.MorphoBluePaybackAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        hre.ethers.constants.MaxUint256,
        placeHolderAddr,
        placeHolderAddr,
    );
    const morphoWithdrawCollateral = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        placeHolderAddr,
        0,
        collAmount,
        placeHolderAddr,
        placeHolderAddr,
    );
    const sellAction = new dfs.actions.basic.SellAction(
        exchangeObject,
        placeHolderAddr,
        placeHolderAddr,
    );
    const feeTakingAction = isL2
        ? new dfs.actions.basic.GasFeeActionL2(gasCost, placeHolderAddr, '0', '0', '10000000')
        : new dfs.actions.basic.GasFeeAction(gasCost, placeHolderAddr, '0');
    const sendTokenToFlAction = new dfs.actions.basic.SendTokenAction(
        placeHolderAddr,
        flAddress,
        0,
    );
    const sendTokenToEoaAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
        placeHolderAddr,
        placeHolderAddr,
        hre.ethers.constants.MaxUint256,
    );
    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(morphoPayback.encodeForRecipe()[0]);
    actionsCallData.push(morphoWithdrawCollateral.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenToFlAction.encodeForRecipe()[0]);
    actionsCallData.push(sendTokenToEoaAction.encodeForRecipe()[0]);
    triggerCallData.push(
        abiCoder.encode(
            ['address', 'address', 'address', 'uint256', 'uint256'],
            [placeHolderAddr, placeHolderAddr, placeHolderAddr, 0, 0],
        ),
    );
    const { callData, receipt } = await executeStrategy(
        isL2,
        strategyExecutor,
        subId,
        strategyIndex,
        triggerCallData,
        actionsCallData,
        strategySub,
    );
    const gasUsed = await getGasUsed(receipt);
    const dollarPrice = calcGasToUSD(gasCost, 0, callData);
    console.log(
        `GasUsed callMorphoBlueFLCloseToDebtStrategy: ${gasUsed}, price at ${AVG_GAS_PRICE} gwei $${dollarPrice}`,
    );
};

module.exports = {
    callDcaStrategy,
    callMcdRepayStrategy,
    callFLMcdRepayStrategy,
    callMcdBoostStrategy,
    callFLMcdBoostStrategy,
    callLimitOrderStrategy,
    callMcdCloseToDaiStrategy,
    callMcdCloseToCollStrategy,
    callCompBoostStrategy,
    callCompRepayStrategy,
    callLiquityBoostStrategy,
    callLiquityFLBoostStrategy,
    callLiquityFLBoostWithCollStrategy,
    callLiquityRepayStrategy,
    callLiquityFLRepayStrategy,
    callLiquityCloseToCollStrategy,
    callMcdRepayFromYearnStrategy,
    callMcdRepayFromYearnWithExchangeStrategy,
    callMcdRepayCompositeStrategy,
    callMcdFLRepayCompositeStrategy,
    callMcdBoostCompositeStrategy,
    callMcdFLBoostCompositeStrategy,
    callCompV2BoostStrategy,
    callCompFLV2BoostStrategy,
    callCompV2RepayStrategy,
    callCompFLV2RepayStrategy,
    callAaveV2BoostStrategy,
    callAaveFLV2BoostStrategy,
    callAaveV2RepayStrategy,
    callAaveFLV2RepayStrategy,
    callSparkRepayStrategy,
    callSparkFLRepayStrategy,
    callSparkBoostStrategy,
    callSparkFLBoostStrategy,
    callLiquityDsrPaybackStrategy,
    callLiquityDsrSupplyStrategy,
    callLiquityDebtInFrontRepayStrategy,
    callAaveCloseToDebtWithMaximumGasPriceStrategy,
    callAaveCloseToDebtStrategy,
    callAaveFLCloseToDebtWithMaximumGasPriceStrategy,
    callAaveFLCloseToDebtStrategy,
    callAaveCloseToCollWithMaximumGasPriceStrategy,
    callAaveCloseToCollStrategy,
    callAaveFLCloseToCollWithMaximumGasPriceStrategy,
    callAaveFLCloseToCollStrategy,
    callCurveUsdAdvancedRepayStrategy,
    callCurveUsdRepayStrategy,
    callCurveUsdFLRepayStrategy,
    callCurveUsdBoostStrategy,
    callCurveUsdFLDebtBoostStrategy,
    callCurveUsdFLCollBoostStrategy,
    callCurveUsdPaybackStrategy,
    callMorphoBlueBoostStrategy,
    callMorphoBlueFLCollBoostStrategy,
    callMorphoBlueFLDebtBoostStrategy,
    callMorphoBlueRepayStrategy,
    callMorphoBlueFLCollRepayStrategy,
    callMorphoBlueFLDebtRepayStrategy,
    callAaveV3OpenOrderFromCollStrategy,
    callAaveV3FLOpenOrderFromCollStrategy,
    callAaveV3FLOpenOrderFromDebtStrategy,
    callMorphoBlueBoostOnTargetPriceStrategy,
    callMorphoBlueFLBoostOnTargetPriceStrategy,
    callLiquityV2RepayStrategy,
    callLiquityV2FLRepayStrategy,
    callLiquityV2BoostStrategy,
    callLiquityV2FLBoostStrategy,
    callLiquityV2FLBoostWithCollStrategy,
    callLiquityV2CloseToCollStrategy,
    callLiquityV2FLCloseToCollStrategy,
    callLiquityV2FLCloseToDebtStrategy,
    callLiquityV2InterestRateAdjustmentStrategy,
    callFluidT1RepayStrategy,
    callFluidT1FLRepayStrategy,
    callFluidT1BoostStrategy,
    callFluidT1FLBoostStrategy,
    callCompV3BoostStrategy,
    callCompV3FLBoostStrategy,
    callCompV3RepayStrategy,
    callCompV3FLRepayStrategy,
    callCompV3RepayOnPriceStrategy,
    callCompV3FLRepayOnPriceStrategy,
    callCompV3BoostOnPriceStrategy,
    callCompV3FLBoostOnPriceStrategy,
    callCompV3FLCloseToCollStrategy,
    callCompV3FLCloseToDebtStrategy,
    callAaveV3GenericBoostStrategy,
    callAaveV3GenericFLBoostStrategy,
    callAaveV3GenericRepayStrategy,
    callAaveV3GenericFLRepayStrategy,
    callAaveV3GenericBoostOnPriceStrategy,
    callAaveV3GenericFLBoostOnPriceStrategy,
    callAaveV3GenericRepayOnPriceStrategy,
    callAaveV3GenericFLRepayOnPriceStrategy,
    callAaveV3GenericFLCloseToCollStrategy,
    callAaveV3GenericFLCloseToDebtStrategy,
    callAaveV3BoostStrategy,
    callAaveV3FLBoostStrategy,
    callAaveV3FLCollateralSwitchStrategy,
    callSparkGenericFLCloseToCollStrategy,
    callSparkGenericFLCloseToDebtStrategy,
    callMorphoBlueFLCloseToCollStrategy,
    callMorphoBlueFLCloseToDebtStrategy,
};
