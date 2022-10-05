const dfs = require('@defisaver/sdk');

const {
    formatExchangeObj,
    nullAddress,
} = require('./utils');

const createAaveV3RepayL2Strategy = () => {
    const aaveV3RepayL2Strategy = new dfs.Strategy('AaveV3RepayL2');

    aaveV3RepayL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3RepayL2Strategy.addSubSlot('&checkRepayState', 'uint256');
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

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '%debtAddr', // must stay variable
            '$1', //  hardcoded piped from fee taking
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as debt can differ
        '$2', // hardcoded output from withdraw action
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
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

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkRepayState',
        '&targetRatio',
    );

    aaveV3RepayL2Strategy.addAction(withdrawAction);
    aaveV3RepayL2Strategy.addAction(sellAction);
    aaveV3RepayL2Strategy.addAction(feeTakingAction);
    aaveV3RepayL2Strategy.addAction(paybackAction);
    aaveV3RepayL2Strategy.addAction(checkerAction);

    return aaveV3RepayL2Strategy.encodeForDsProxyCall();
};

const createAaveFLV3RepayL2Strategy = () => {
    const aaveV3RepayL2Strategy = new dfs.Strategy('AaveFLV3RepayL2');

    aaveV3RepayL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3RepayL2Strategy.addSubSlot('&checkRepayState', 'uint256');
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

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '%debtAddr', // must stay variable
            '0', //  can't hard code because of fee
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from sell
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
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
        '$1', // repay fl amount
        '%flAddr', // flAddr not hardcoded (tx will fail if not returned to correct addr)
        '%market', // hardcoded because default market is true
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkRepayState',
        '&targetRatio',
    );

    aaveV3RepayL2Strategy.addAction(flAction);
    aaveV3RepayL2Strategy.addAction(sellAction);
    aaveV3RepayL2Strategy.addAction(feeTakingAction);
    aaveV3RepayL2Strategy.addAction(paybackAction);
    aaveV3RepayL2Strategy.addAction(withdrawAction);
    aaveV3RepayL2Strategy.addAction(checkerAction);

    return aaveV3RepayL2Strategy.encodeForDsProxyCall();
};

const createAaveV3BoostL2Strategy = () => {
    const aaveV3BoostL2Strategy = new dfs.Strategy('AaveV3BoostL2');

    aaveV3BoostL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3BoostL2Strategy.addSubSlot('&checkBoostState', 'uint256');
    aaveV3BoostL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3BoostL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3BoostL2Strategy.addSubSlot('&enableAsColl', 'bool');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger('0', '0', '0');
    aaveV3BoostL2Strategy.addTrigger(aaveV3Trigger);

    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '&useDefaultMarket', // default market
        '%marketAddr', // hardcoded because default market is true
        '%amount', // must stay variable
        '&proxy', // hardcoded
        '%rateMode', // depends on type of debt we want
        '%assetId', // must stay variable can choose diff. asset
        '&useOnBehalf', // set to false hardcoded
        '%onBehalfAddr', // set to empty because flag is true
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%debtAddr', // must stay variable
            '%collAddr', // must stay variable
            '$1', //  hardcoded piped from borrow
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from withdraw action
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%collAddr', // is variable as it can change
        '%assetId', // must be variable
        '&enableAsColl', // hardcoded always enable as coll
        '&useDefaultMarket', // hardcoded default market
        '&useOnBehalf', // hardcoded false use on behalf
        '%market', // hardcoded 0
        '%onBehalf', // hardcoded 0 as its false
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkBoostState',
        '&targetRatio',
    );

    aaveV3BoostL2Strategy.addAction(borrowAction);
    aaveV3BoostL2Strategy.addAction(sellAction);
    aaveV3BoostL2Strategy.addAction(feeTakingAction);
    aaveV3BoostL2Strategy.addAction(supplyAction);
    aaveV3BoostL2Strategy.addAction(checkerAction);

    return aaveV3BoostL2Strategy.encodeForDsProxyCall();
};

const createAaveFLV3BoostL2Strategy = () => {
    const aaveV3BoostL2Strategy = new dfs.Strategy('AaveFLV3BoostL2');

    aaveV3BoostL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3BoostL2Strategy.addSubSlot('&checkBoostState', 'uint256');
    aaveV3BoostL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3BoostL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3BoostL2Strategy.addSubSlot('&enableAsColl', 'bool');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger('0', '0', '0');
    aaveV3BoostL2Strategy.addTrigger(aaveV3Trigger);

    const flAction = new dfs.actions.flashloan.AaveV3FlashLoanAction(
        ['%repayAmount'],
        ['%collAsset'],
        ['%AAVE_NO_DEBT_MODE'],
        nullAddress,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%debtAddr', // must stay variable
            '%collAddr', // must stay variable
            '%flAmount', // variable as flAmount returns with fee
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%collAddr', // is variable as it can change
        '%assetId', // must be variable
        '&enableAsColl', // hardcoded always enable as coll
        '&useDefaultMarket', // hardcoded default market
        '&useOnBehalf', // hardcoded false use on behalf
        '%market', // hardcoded 0
        '%onBehalf', // hardcoded 0 as its false

    );

    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '&useDefaultMarket', // default market
        '%marketAddr', // hardcoded because default market is true
        '$1', // from Fl amount
        '%flAddr', // fl address that can change
        '%rateMode', // depends on type of debt we want
        '%assetId', // must stay variable can choose diff. asset
        '&useOnBehalf', // set to true hardcoded
        '%onBehalfAddr', // set to empty because flag is true
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkBoostState',
        '&targetRatio',
    );

    aaveV3BoostL2Strategy.addAction(flAction);
    aaveV3BoostL2Strategy.addAction(sellAction);
    aaveV3BoostL2Strategy.addAction(feeTakingAction);
    aaveV3BoostL2Strategy.addAction(supplyAction);
    aaveV3BoostL2Strategy.addAction(borrowAction);
    aaveV3BoostL2Strategy.addAction(checkerAction);

    return aaveV3BoostL2Strategy.encodeForDsProxyCall();
};

const createAaveV3CloseToDebtL2Strategy = () => {
    const strategyName = 'AaveCloseToDebtL2';

    const aaveCloseStrategy = new dfs.Strategy(strategyName);
    aaveCloseStrategy.addSubSlot('&collAsset', 'address');
    aaveCloseStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveCloseStrategy.addSubSlot('&debtAsset', 'address');
    aaveCloseStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveCloseStrategy.addSubSlot('&rateMode', 'uint8');

    const trigger = new dfs.triggers.AaveQuotePriceTrigger(nullAddress, nullAddress, '0', '0');

    aaveCloseStrategy.addTrigger(trigger);

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '&collAssetId',
        '%true',
        '%daiAmountToWithdraw(maxUint)',
        '&proxy',
        '%nullAddress',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset', // must be left variable diff. coll from cdps
            '&debtAsset', // hardcoded always will be buying dai
            '%amountToSell(maxUint)', // amount to sell is variable
            '%exchangeWrapper', // exchange wrapper can change
        ),
        '&proxy', // hardcoded take from user proxy
        '&proxy', // hardcoded send to user proxy
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '0', // must stay variable backend sets gasCost
        '&debtAsset', // must stay variable as coll can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%true',
        '%nullAddress',
        '%daiAmountToPayback(maxUint)', // kept variable (can support partial close later)
        '&proxy',
        '&rateMode',
        '&debtAsset',
        '&debtAssetId',
        '%false',
        '%nullAddress',
    );

    const sendAction = new dfs.actions.basic.SendTokenAction(
        '&debtAsset', // hardcoded Dai is left in proxy
        '&eoa', // hardcoded so only proxy owner receives amount
        '%amountToRecipient(maxUint)', // kept variable (can support partial close later)
    );

    aaveCloseStrategy.addAction(withdrawAction);
    aaveCloseStrategy.addAction(sellAction);
    aaveCloseStrategy.addAction(feeTakingAction);
    aaveCloseStrategy.addAction(paybackAction);
    aaveCloseStrategy.addAction(sendAction);

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createAaveV3FLCloseToDebtL2Strategy = () => {
    const strategyName = 'AaveFLCloseToDebtL2';

    const aaveCloseStrategy = new dfs.Strategy(strategyName);
    aaveCloseStrategy.addSubSlot('&collAsset', 'address');
    aaveCloseStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveCloseStrategy.addSubSlot('&debtAsset', 'address');
    aaveCloseStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveCloseStrategy.addSubSlot('&rateMode', 'uint8');

    const trigger = new dfs.triggers.AaveQuotePriceTrigger(nullAddress, nullAddress, '0', '0');

    aaveCloseStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.AaveV3FlashLoanAction(
        ['%repayAmount'],
        ['%debtAsset'],
        ['%AAVE_NO_DEBT_MODE'],
        nullAddress,
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%true',
        '%nullAddress',
        '%daiAmountToPayback(maxUint)', // kept variable (can support partial close later)
        '&proxy',
        '&rateMode',
        '&debtAsset',
        '&debtAssetId',
        '%false',
        '%nullAddress',
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '&collAssetId',
        '%true',
        '%daiAmountToWithdraw(maxUint)',
        '&proxy',
        '%nullAddress',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset', // must be left variable diff. coll from cdps
            '&debtAsset', // hardcoded always will be buying dai
            '%amountToSell(maxUint)', // amount to sell is variable
            '%exchangeWrapper', // exchange wrapper can change
        ),
        '&proxy', // hardcoded take from user proxy
        '&proxy', // hardcoded send to user proxy
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '0', // must stay variable backend sets gasCost
        '&debtAsset', // must stay variable as coll can differ
        '$4', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const sendAction = new dfs.actions.basic.SendTokenAction(
        '&debtAsset', // hardcoded only can borrow Dai
        '%makerFlAddr', // kept variable this can change (FL must be payed back to work)
        '$1', // hardcoded output from FL action
    );

    const sendAction1 = new dfs.actions.basic.SendTokenAction(
        '&debtAsset', // hardcoded Dai is left in proxy
        '&eoa', // hardcoded so only proxy owner receives amount
        '%amountToRecipient(maxUint)', // kept variable (can support partial close later)
    );

    aaveCloseStrategy.addAction(flAction);
    aaveCloseStrategy.addAction(paybackAction);
    aaveCloseStrategy.addAction(withdrawAction);
    aaveCloseStrategy.addAction(sellAction);
    aaveCloseStrategy.addAction(feeTakingAction);
    aaveCloseStrategy.addAction(sendAction);
    aaveCloseStrategy.addAction(sendAction1);

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createAaveV3CloseToCollL2Strategy = () => {
    const strategyName = 'AaveCloseToCollL2';

    const aaveCloseStrategy = new dfs.Strategy(strategyName);
    aaveCloseStrategy.addSubSlot('&collAsset', 'address');
    aaveCloseStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveCloseStrategy.addSubSlot('&debtAsset', 'address');
    aaveCloseStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveCloseStrategy.addSubSlot('&rateMode', 'uint8');

    const trigger = new dfs.triggers.AaveQuotePriceTrigger(nullAddress, nullAddress, '0', '0');

    aaveCloseStrategy.addTrigger(trigger);

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '&collAssetId',
        '%true',
        '%daiAmountToWithdraw(maxUint)',
        '&proxy',
        '%nullAddress',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset', // must be left variable diff. coll from cdps
            '&debtAsset', // hardcoded always will be buying dai
            '%amountToSell', // amount to sell is variable
            '%exchangeWrapper', // exchange wrapper can change
        ),
        '&proxy', // hardcoded take from user proxy
        '&proxy', // hardcoded send to user proxy
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '0', // must stay variable backend sets gasCost
        '&debtAsset', // must stay variable as coll can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%true',
        '%nullAddress',
        '%daiAmountToPayback(maxUint)', // kept variable (can support partial close later)
        '&proxy',
        '&rateMode',
        '&debtAsset',
        '&debtAssetId',
        '%false',
        '%nullAddress',
    );

    const sendAction1 = new dfs.actions.basic.SendTokenAction(
        '&debtAsset', // hardcoded Dai is left in proxy
        '&eoa', // hardcoded so only proxy owner receives amount
        '%amountToRecipient(maxUint)', // kept variable (can support partial close later)
    );

    const sendAction2 = new dfs.actions.basic.SendTokenAction(
        '&collAsset', // hardcoded Dai is left in proxy
        '&eoa', // hardcoded so only proxy owner receives amount
        '%amountToRecipient(maxUint)', // kept variable (can support partial close later)
    );

    aaveCloseStrategy.addAction(withdrawAction);
    aaveCloseStrategy.addAction(sellAction);
    aaveCloseStrategy.addAction(feeTakingAction);
    aaveCloseStrategy.addAction(paybackAction);
    aaveCloseStrategy.addAction(sendAction1);
    aaveCloseStrategy.addAction(sendAction2);

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createAaveV3FLCloseToCollL2Strategy = () => {
    const strategyName = 'AaveFLCloseToCollL2';

    const aaveCloseStrategy = new dfs.Strategy(strategyName);
    aaveCloseStrategy.addSubSlot('&collAsset', 'address');
    aaveCloseStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveCloseStrategy.addSubSlot('&debtAsset', 'address');
    aaveCloseStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveCloseStrategy.addSubSlot('&rateMode', 'uint8');

    const trigger = new dfs.triggers.AaveQuotePriceTrigger(nullAddress, nullAddress, '0', '0');

    aaveCloseStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.AaveV3FlashLoanAction(
        ['%repayAmount'],
        ['%debtAsset'],
        ['%AAVE_NO_DEBT_MODE'],
        nullAddress,
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%true',
        '%nullAddress',
        '%daiAmountToPayback(maxUint)', // kept variable (can support partial close later)
        '&proxy',
        '&rateMode',
        '&debtAsset',
        '&debtAssetId',
        '%false',
        '%nullAddress',
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '&collAssetId',
        '%true',
        '%daiAmountToWithdraw(maxUint)',
        '&proxy',
        '%nullAddress',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset', // must be left variable diff. coll from cdps
            '&debtAsset', // hardcoded always will be buying dai
            '%amountToSell', // amount to sell is variable
            '%exchangeWrapper', // exchange wrapper can change
        ),
        '&proxy', // hardcoded take from user proxy
        '&proxy', // hardcoded send to user proxy
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '0', // must stay variable backend sets gasCost
        '&debtAsset', // must stay variable as coll can differ
        '$4', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const sendAction0 = new dfs.actions.basic.SendTokenAction(
        '&debtAsset', // hardcoded only can borrow Dai
        '%makerFlAddr', // kept variable this can change (FL must be payed back to work)
        '$1', // hardcoded output from FL action
    );

    const sendAction1 = new dfs.actions.basic.SendTokenAction(
        '&debtAsset', // hardcoded Dai is left in proxy
        '&eoa', // hardcoded so only proxy owner receives amount
        '%amountToRecipient(maxUint)', // kept variable (can support partial close later)
    );

    const sendAction2 = new dfs.actions.basic.SendTokenAction(
        '&collAsset', // hardcoded Dai is left in proxy
        '&eoa', // hardcoded so only proxy owner receives amount
        '%amountToRecipient(maxUint)', // kept variable (can support partial close later)
    );

    aaveCloseStrategy.addAction(flAction);
    aaveCloseStrategy.addAction(paybackAction);
    aaveCloseStrategy.addAction(withdrawAction);
    aaveCloseStrategy.addAction(sellAction);
    aaveCloseStrategy.addAction(feeTakingAction);
    aaveCloseStrategy.addAction(sendAction0);
    aaveCloseStrategy.addAction(sendAction1);
    aaveCloseStrategy.addAction(sendAction2);

    return aaveCloseStrategy.encodeForDsProxyCall();
};

module.exports = {
    createAaveV3RepayL2Strategy,
    createAaveFLV3RepayL2Strategy,
    createAaveV3BoostL2Strategy,
    createAaveFLV3BoostL2Strategy,
    createAaveV3CloseToDebtL2Strategy,
    createAaveV3FLCloseToDebtL2Strategy,
    createAaveV3CloseToCollL2Strategy,
    createAaveV3FLCloseToCollL2Strategy,
};
