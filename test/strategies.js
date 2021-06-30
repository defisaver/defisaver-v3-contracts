const dfs = require('@defisaver/sdk');
const hre = require('hardhat');

const {
    subStrategy,
    getLatestTemplateId,
} = require('./utils-strategies');

const {
    createMcdTrigger,
    RATIO_STATE_UNDER,
    RATIO_STATE_OVER,
} = require('./triggers');

const {
    formatExchangeObj,
    getGasUsed,
    placeHolderAddr,
    MCD_MANAGER_ADDR,
    WETH_ADDRESS,
    DAI_ADDR,
    UNISWAP_WRAPPER,
} = require('./utils');

const abiCoder = new hre.ethers.utils.AbiCoder();

const subMcdRepayStrategy = async (proxy, vaultId, rationUnder, targetRatio) => {
    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const proxyAddrEncoded = abiCoder.encode(['address'], [proxy.address]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);

    const templateId = await getLatestTemplateId();
    const triggerData = await createMcdTrigger(vaultId, rationUnder, RATIO_STATE_UNDER);

    // eslint-disable-next-line max-len
    const strategyId = await subStrategy(proxy, [templateId], true, [vaultIdEncoded, proxyAddrEncoded, targetRatioEncoded],
        [triggerData]);

    return strategyId;
};

const subMcdBoostStrategy = async (proxy, vaultId, rationUnder, targetRatio) => {
    const vaultIdEncoded = abiCoder.encode(['uint256'], [vaultId.toString()]);
    const proxyAddrEncoded = abiCoder.encode(['address'], [proxy.address]);
    const targetRatioEncoded = abiCoder.encode(['uint256'], [targetRatio.toString()]);

    const templateId = await getLatestTemplateId();
    const triggerData = await createMcdTrigger(vaultId, rationUnder, RATIO_STATE_OVER);

    // eslint-disable-next-line max-len
    const strategyId = await subStrategy(proxy, [templateId], true, [vaultIdEncoded, proxyAddrEncoded, targetRatioEncoded],
        [triggerData]);

    return strategyId;
};

const callMcdRepayStrategy = async (botAcc, strategyExecutor, strategyId, ethJoin, repayAmount) => {
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
    const receipt = await strategyExecutorByBot.executeStrategy(strategyId, 0, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed callMcdRepayStrategy; ${gasUsed}`);
};

const callMcdBoostStrategy = async (botAcc, strategyExecutor, strategyId, ethJoin, boostAmount) => {
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
    const receipt = await strategyExecutorByBot.executeStrategy(strategyId, 0, triggerCallData, actionsCallData, {
        gasLimit: 8000000,
    });

    const gasUsed = await getGasUsed(receipt);
    console.log(`GasUsed callMcdBoostStrategy; ${gasUsed}`);
};

module.exports = {
    subMcdRepayStrategy,
    subMcdBoostStrategy,
    callMcdRepayStrategy,
    callMcdBoostStrategy,
};
