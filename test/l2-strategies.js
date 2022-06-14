const dfs = require('@defisaver/sdk');

const {
    formatExchangeObj,
    nullAddress,
} = require('./utils');

const createAaveV3RepayL2Strategy = () => {
    const aaveV3RepayL2Strategy = new dfs.Strategy('AaveV3RepayL2');

    aaveV3RepayL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3RepayL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3RepayL2Strategy.addSubSlot('&useOnBehalf', 'bool');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger('0', '0', '0');
    aaveV3RepayL2Strategy.addTrigger(aaveV3Trigger);

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%assetId', // must stay variable can choose diff. asset
        '&useDefaultMarket', // set to true hardcoded
        '%amount', // must stay variable
        '&proxy', // hardcoded
        '%market', // hardcoded because default market is true
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$1', // hardcoded output from withdraw action
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '%debtAddr', // must stay variable
            '$2', //  hardcoded piped from fee taking
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '&useDefaultMarket', // set to true hardcoded
        '%market', // hardcoded because default market is true
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '%debtAddr', // used just for sdk not actually sent (should this be here?)
        '%assetId', // must be variable
        '&useOnBehalf', // hardcoded false
        '%onBehalf', // hardcoded 0 as its false
    );

    aaveV3RepayL2Strategy.addAction(withdrawAction);
    aaveV3RepayL2Strategy.addAction(feeTakingAction);
    aaveV3RepayL2Strategy.addAction(sellAction);
    aaveV3RepayL2Strategy.addAction(paybackAction);

    return aaveV3RepayL2Strategy.encodeForDsProxyCall();
};

const createAaveFLV3RepayL2Strategy = () => {
    const aaveV3RepayL2Strategy = new dfs.Strategy('AaveFLV3RepayL2');

    aaveV3RepayL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3RepayL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3RepayL2Strategy.addSubSlot('&useOnBehalf', 'bool');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger('0', '0', '0');
    aaveV3RepayL2Strategy.addTrigger(aaveV3Trigger);

    const flAction = new dfs.actions.flashloan.AaveV3FlashLoanAction(
        ['%repayAmount'],
        ['%collAsset'],
        ['%AAVE_NO_DEBT_MODE'],
        nullAddress,
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$1', // hardcoded output from withdraw action
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '%debtAddr', // must stay variable
            '$2', //  hardcoded piped from fee taking
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '&useDefaultMarket', // set to true hardcoded
        '%market', // hardcoded because default market is true
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '%debtAddr', // used just for sdk not actually sent (should this be here?)
        '%assetId', // must be variable
        '&useOnBehalf', // hardcoded false
        '%onBehalf', // hardcoded 0 as its false
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%assetId', // must stay variable can choose diff. asset
        '&useDefaultMarket', // set to true hardcoded
        '%amount', // must stay variable
        '%flAddr', // flAddr not hardcoded (tx will fail if not returned to correct addr)
        '%market', // hardcoded because default market is true
    );

    aaveV3RepayL2Strategy.addAction(flAction);
    aaveV3RepayL2Strategy.addAction(withdrawAction);
    aaveV3RepayL2Strategy.addAction(feeTakingAction);
    aaveV3RepayL2Strategy.addAction(sellAction);
    aaveV3RepayL2Strategy.addAction(paybackAction);

    return aaveV3RepayL2Strategy.encodeForDsProxyCall();
};

module.exports = {
    createAaveV3RepayL2Strategy,
    createAaveFLV3RepayL2Strategy,
};
