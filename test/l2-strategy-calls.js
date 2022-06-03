const dfs = require('@defisaver/sdk');
const hre = require('hardhat');

const {
    formatExchangeObj,
    getGasUsed,
    calcGasToUSD,
    placeHolderAddr,
    addrs,
    network,
} = require('./utils');

const abiCoder = new hre.ethers.utils.AbiCoder();

const callAaveV3RepayL2Strategy = async (
    botAcc,
    strategyExecutor,
    subId,
    strategySub,
    ethAssetId,
    daiAssetId,
    repayAmount,
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

    const repayGasCost = 1_200_000; // 1.2 mil gas
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(repayGasCost, addrs[network].WETH_ADDRESS, '0');

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
    actionsCallData.push(feeTakingAction.encodeForRecipe()[0]);
    actionsCallData.push(sellAction.encodeForRecipe()[0]);
    actionsCallData.push(paybackAction.encodeForRecipe()[0]);

    const strategyExecutorByBot = strategyExecutor.connect(botAcc);
    triggerCallData.push(abiCoder.encode(['uint256'], ['0']));

    const callData = strategyExecutorByBot.interface.encodeFunctionData('executeStrategy', [
        subId,
        0,
        triggerCallData,
        actionsCallData,
    ]);

    console.log(callData);

    // eslint-disable-next-line max-len
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
    const dollarPrice = calcGasToUSD(repayGasCost, 0, callData);

    console.log(
        `GasUsed callAaveV3RepayL2Strategy: ${gasUsed}, price at mainnet ${addrs.mainnet.AVG_GAS_PRICE} gwei $${dollarPrice} and ${addrs[network].AVG_GAS_PRICE} gwei on L2`,
    );
};

module.exports = {
    callAaveV3RepayL2Strategy,
};
