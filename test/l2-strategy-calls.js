const dfs = require('@defisaver/sdk');
const hre = require('hardhat');

const {
    formatExchangeObj,
    getGasUsed,
    calcGasToUSD,
    placeHolderAddr,
    nullAddress,
    addrs,
    network,
} = require('./utils');

const abiCoder = new hre.ethers.utils.AbiCoder();

const AAVE_NO_DEBT_MODE = 0;

const callAaveV3RepayL2Strategy = async (
    botAcc,
    strategyExecutor,
    subId,
    ethAssetId,
    daiAssetId,
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
            addrs[network].WETH_ADDRESS,
            addrs[network].DAI_ADDRESS,
            '0',
            addrs[network].UNISWAP_WRAPPER,
            0,
            3000,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const repayGasCost = 1_000_000; // 1 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, addrs[network].DAI_ADDRESS, '0');

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        true,
        placeHolderAddr, // market
        0, // amount
        placeHolderAddr, // proxy
        2, // rateMode
        addrs[network].DAI_ADDR, // debtAddr
        daiAssetId,
        false, // useOnBehalf
        placeHolderAddr, // onBehalf
    );

    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);

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
            addrs[network].WETH_ADDRESS,
            addrs[network].DAI_ADDRESS,
            repayAmount,
            addrs[network].UNISWAP_WRAPPER,
            0,
            3000,
        ),
        placeHolderAddr,
        placeHolderAddr,
    );

    const repayGasCost = 1_330_000; // 1.33 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, addrs[network].DAI_ADDRESS, '0');

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        true,
        placeHolderAddr, // market
        0, // amount
        placeHolderAddr, // proxy
        2, // rateMode
        addrs[network].DAI_ADDR, // debtAddr
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

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);
    actionsCallData.push(withdrawAction.encodeForRecipe()[0]);

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

    const repayGasCost = 1_000_000; // 1 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, collAddr, '0');

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

    actionsCallData.push(borrowAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);

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

    const repayGasCost = 1_320_000; // 1.32 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, collAddr, '0');

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

    actionsCallData.push(flAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(supplyAction.encodeForRecipe()[0]);
    actionsCallData.push(borrowAction.encodeForRecipe()[0]);

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
        `GasUsed callAaveFLV3BoostL2Strategy: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice} and ${addrs[network].AVG_GAS_PRICE} gwei on L2`,
    );
};

module.exports = {
    callAaveV3RepayL2Strategy,
    callAaveFLV3RepayL2Strategy,
    callAaveV3BoostL2Strategy,
    callAaveFLV3BoostL2Strategy,
};
