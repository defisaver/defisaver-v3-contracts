/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const dfs = require('@defisaver/sdk');

const {
    formatExchangeObj,
    nullAddress,
    placeHolderAddr,
} = require('../test/utils/utils');

const createAaveV3RepayL2Strategy = () => {
    const aaveV3RepayL2Strategy = new dfs.Strategy('AaveV3RepayL2');

    aaveV3RepayL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3RepayL2Strategy.addSubSlot('&checkRepayState', 'uint256');
    aaveV3RepayL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3RepayL2Strategy.addSubSlot('&useOnBehalf', 'bool');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger('0', '0', '0');
    aaveV3RepayL2Strategy.addTrigger(aaveV3Trigger);

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '&useDefaultMarket', // set to true hardcoded
        '%market', // hardcoded because default market is true
        '%amount', // must stay variable
        '&proxy', // hardcoded
        '%assetId', // must stay variable can choose diff. asset
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
        ['%collAsset'],
        ['%repayAmount'],
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
        '&useDefaultMarket', // set to true hardcoded
        '%market', // hardcoded because default market is true
        '$1', // repay fl amount
        '%flAddr', // flAddr not hardcoded (tx will fail if not returned to correct addr)
        '%assetId', // must stay variable can choose diff. asset
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
        '&useDefaultMarket', // hardcoded default market
        '%market', // hardcoded 0
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%collAddr', // is variable as it can change
        '%assetId', // must be variable
        '&enableAsColl', // hardcoded always enable as coll
        '&useOnBehalf', // hardcoded false use on behalf
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
        ['%collAsset'],
        ['%repayAmount'],
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
        '&useDefaultMarket', // hardcoded default market
        '%market', // hardcoded 0
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%collAddr', // is variable as it can change
        '%assetId', // must be variable
        '&enableAsColl', // hardcoded always enable as coll
        '&useOnBehalf', // hardcoded false use on behalf
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

const aaveV3CloseActions = {
    flAction: () => new dfs.actions.flashloan.AaveV3FlashLoanAction(
        ['%debtAsset'],
        ['%repayAmount'], // cant pipe in FL actions :(
        ['%AAVE_NO_DEBT_MODE'],
        '%nullAddress',
    ),

    paybackAction: () => new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%true', // useDefaultMarket - true or will revert
        '&nullAddress', // market
        '%repayAmount', // kept variable (can support partial close later)
        '&proxy',
        '%rateMode',
        '&debtAsset', // one subscription - one token pair
        '&debtAssetId',
        '%false', // useOnBehalf - false or will revert
        '&nullAddress', // onBehalfOf
    ),

    withdrawAction: () => new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%true', // useDefaultMarket - true or will revert
        '&nullAddress', // market
        '%withdrawAmount', // kept variable (can support partial close later)
        '&proxy',
        '&collAssetId', // one subscription - one token pair
    ),

    sellAction: () => new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset', // one subscription - one token pair
            '%swapAmount', // amount to sell is variable
            '%exchangeWrapper', // exchange wrapper can change
        ),
        '&proxy', // hardcoded take from user proxy
        '&proxy', // hardcoded send to user proxy
    ),

    feeTakingActionFL: () => new dfs.actions.basic.GasFeeActionL2(
        '%gasCost', // must stay variable backend sets gasCost
        '&debtAsset',
        '$4', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
    ),

    feeTakingAction: () => new dfs.actions.basic.GasFeeActionL2(
        '%gasCost', // must stay variable backend sets gasCost
        '&debtAsset',
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
    ),

    feeTakingActionFLColl: () => new dfs.actions.basic.GasFeeActionL2(
        '%gasCost', // must stay variable backend sets gasCost
        '&collAsset',
        '$3', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
    ),

    feeTakingActionColl: () => new dfs.actions.basic.GasFeeActionL2(
        '%gasCost', // must stay variable backend sets gasCost
        '&collAsset',
        '$1', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // send custom amount for Optimism
    ),

    sendRepayFL: () => new dfs.actions.basic.SendTokenAction(
        '&debtAsset',
        '%flAddr', // kept variable this can change (FL must be paid back to work)
        '$1', // hardcoded output from FL action
    ),

    sendDebt: () => new dfs.actions.basic.SendTokenAndUnwrapAction(
        '&debtAsset',
        '&eoa', // hardcoded so only proxy owner receives amount
        '%amountToRecipient(maxUint)', // will always be maxUint
    ),

    sendColl: () => new dfs.actions.basic.SendTokenAndUnwrapAction(
        '&collAsset',
        '&eoa', // hardcoded so only proxy owner receives amount
        '%amountToRecipient(maxUint)', // will always be maxUint
    ),
};

const createAaveCloseStrategyBase = (strategyName) => {
    const aaveCloseStrategy = new dfs.Strategy(strategyName);
    aaveCloseStrategy.addSubSlot('&collAsset', 'address');
    aaveCloseStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveCloseStrategy.addSubSlot('&debtAsset', 'address');
    aaveCloseStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveCloseStrategy.addSubSlot('&nullAddress', 'address');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');

    aaveCloseStrategy.addTrigger(trigger);

    return aaveCloseStrategy;
};

const createAaveV3CloseToDebtL2Strategy = () => {
    const strategyName = 'AaveV3CloseToDebtL2';

    const aaveCloseStrategy = createAaveCloseStrategyBase(strategyName);

    aaveCloseStrategy.addAction(aaveV3CloseActions.withdrawAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sellAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.feeTakingAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.paybackAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendDebt());

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createAaveV3FLCloseToDebtL2Strategy = () => {
    const strategyName = 'AaveV3FLCloseToDebtL2';

    const aaveCloseStrategy = createAaveCloseStrategyBase(strategyName);

    aaveCloseStrategy.addAction(aaveV3CloseActions.flAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.paybackAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.withdrawAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sellAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.feeTakingActionFL());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendRepayFL());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendDebt());

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createAaveV3CloseToCollL2Strategy = () => {
    const strategyName = 'AaveV3CloseToCollL2';

    const aaveCloseStrategy = createAaveCloseStrategyBase(strategyName);

    aaveCloseStrategy.addAction(aaveV3CloseActions.withdrawAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.feeTakingActionColl());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sellAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.paybackAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendDebt());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendColl());

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createAaveV3FLCloseToCollL2Strategy = () => {
    const strategyName = 'AaveV3FLCloseToCollL2';

    const aaveCloseStrategy = createAaveCloseStrategyBase(strategyName);

    aaveCloseStrategy.addAction(aaveV3CloseActions.flAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.paybackAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.withdrawAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.feeTakingActionFLColl());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sellAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendRepayFL());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendDebt());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendColl());

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createDCAL2Strategy = () => {
    const dcaStrategy = new dfs.Strategy('DCAL2Strategy');

    dcaStrategy.addSubSlot('&sellToken', 'address');
    dcaStrategy.addSubSlot('&buyToken', 'address');
    dcaStrategy.addSubSlot('&amount', 'uint256');
    dcaStrategy.addSubSlot('&interval', 'uint256');

    const timestampTrigger = new dfs.triggers.TimestampTrigger('0');
    dcaStrategy.addTrigger(timestampTrigger);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&sellToken',
            '&buyToken',
            '&amount',
            '%exchangeWrapper',
        ),
        '&eoa',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '0', '&buyToken', '$1', '%l1GasCostInEth',
    );

    const sendTokenAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
        '&buyToken', '&eoa', '$2',
    );

    dcaStrategy.addAction(sellAction);
    dcaStrategy.addAction(feeTakingAction);
    dcaStrategy.addAction(sendTokenAction);

    return dcaStrategy.encodeForDsProxyCall();
};

const createLimitOrderL2Strategy = () => {
    const limitOrderStrategy = new dfs.Strategy('LimitOrderL2Strategy');

    const offchainPriceTrigger = new dfs.triggers.OffchainPriceTrigger('0', '0');
    limitOrderStrategy.addTrigger(offchainPriceTrigger);

    limitOrderStrategy.addSubSlot('&tokenAddrSell', 'address');
    limitOrderStrategy.addSubSlot('&tokenAddrBuy', 'address');
    limitOrderStrategy.addSubSlot('&amount', 'uint256');

    const sellAction = new dfs.actions.basic.LimitSellActionL2(
        formatExchangeObj(
            '&tokenAddrSell',
            '&tokenAddrBuy',
            '&amount',
            '%exchangeWrapper',
        ),
        '&eoa',
        '&eoa',
        '%gasUsed',
        '%l1GasUsed',
    );

    limitOrderStrategy.addAction(sellAction);

    return limitOrderStrategy.encodeForDsProxyCall();
};

const addSubSlotsToCompV3Strategy = (strategy) => {
    strategy.addSubSlot('&market', 'address');
    strategy.addSubSlot('&baseToken', 'address');
    strategy.addSubSlot('&ratioState', 'uint256');
    strategy.addSubSlot('&targetRatio', 'uint256');
};

const compV3Trigger = new dfs.triggers.CompV3RatioTrigger('0', '0', '0');

const compV3Actions = {
    withdraw: (to, amount) => new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        '&market', // comet proxy addr of used market
        to,
        '%assetAddr', // variable token to withdraw
        amount,
    ),
    sellAction: (src, dest, amount) => new dfs.actions.basic.SellAction(
        formatExchangeObj(
            src,
            dest,
            amount,
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    ),
    feeTakingAction: (baseToken, amount) => new dfs.actions.basic.GasFeeActionL2(
        '0', // must stay variable backend sets gasCost
        baseToken, // must stay variable as debt can differ
        amount, // available amount to pay gas
        '%dfsFeeDivider', // defaults at 0.05%
        '%l1GasCostInEth', // additional gas cost for L1
    ),
    paybackAction: (amount) => new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market', // hardcoded
        amount,
        '&proxy', // proxy hardcoded (from)
        '&proxy', // proxy hardcoded (onBehalf)
        placeHolderAddr, // additional only needed for sdk for front
    ),
    checkerAction: () => new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState', '&targetRatio', '&market',
    ),
    flAction: (token, amount) => new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction([token], [amount]),
    ),
    borrowAction: (amount, to) => new dfs.actions.compoundV3.CompoundV3BorrowAction(
        '&market', // comet proxy addr of used market
        amount, // variable amount to borrow
        to, // hardcoded
    ),
    supplyAction: (amount) => new dfs.actions.compoundV3.CompoundV3SupplyAction(
        '&market', // hardcoded
        '%collAsset', // variable coll token
        amount,
        '&proxy', // proxy hardcoded (from)
    ),
};

const createCompV3RepayL2Strategy = () => {
    const compV3RepayStrategy = new dfs.Strategy('CompV3RepayL2');
    addSubSlotsToCompV3Strategy(compV3RepayStrategy);

    compV3RepayStrategy.addTrigger(compV3Trigger);
    compV3RepayStrategy.addAction(compV3Actions.withdraw('&proxy', '%amount')); // variable amount to withdraw
    compV3RepayStrategy.addAction(compV3Actions.sellAction('%collAddr', '&baseToken', '$1')); // pipe amount from withdraw
    compV3RepayStrategy.addAction(compV3Actions.feeTakingAction('&baseToken', '$2')); // pipe amount from sell
    compV3RepayStrategy.addAction(compV3Actions.paybackAction('$3')); // pipe amount from fee taking
    compV3RepayStrategy.addAction(compV3Actions.checkerAction());

    return compV3RepayStrategy.encodeForDsProxyCall();
};

const createCompV3FLRepayL2Strategy = () => {
    const compV3FlRepayStrategy = new dfs.Strategy('CompV3FlRepayL2');
    addSubSlotsToCompV3Strategy(compV3FlRepayStrategy);

    compV3FlRepayStrategy.addTrigger(compV3Trigger);
    compV3FlRepayStrategy.addAction(compV3Actions.flAction('%collAddr', '%repayAmount'));
    compV3FlRepayStrategy.addAction(compV3Actions.sellAction('%collAddr', '&baseToken', '%amount')); // variable amount to sell
    compV3FlRepayStrategy.addAction(compV3Actions.feeTakingAction('&baseToken', '$2')); // pipe amount from sell
    compV3FlRepayStrategy.addAction(compV3Actions.paybackAction('$3')); // pipe amount from fee taking
    compV3FlRepayStrategy.addAction(compV3Actions.withdraw('%flAddr', '$1')); // send back FL amount
    compV3FlRepayStrategy.addAction(compV3Actions.checkerAction());

    return compV3FlRepayStrategy.encodeForDsProxyCall();
};

const createCompV3BoostL2Strategy = () => {
    const compV3BoostStrategy = new dfs.Strategy('CompV3BoostL2');
    addSubSlotsToCompV3Strategy(compV3BoostStrategy);

    compV3BoostStrategy.addTrigger(compV3Trigger);
    compV3BoostStrategy.addAction(compV3Actions.borrowAction('%amount', '&proxy')); // to proxy
    compV3BoostStrategy.addAction(compV3Actions.sellAction('&baseToken', '%collToken', '$1'));
    compV3BoostStrategy.addAction(compV3Actions.feeTakingAction('%collToken', '$2')); // pipe amount from sell
    compV3BoostStrategy.addAction(compV3Actions.supplyAction('$3')); // pipe amount from fee taking
    compV3BoostStrategy.addAction(compV3Actions.checkerAction());

    return compV3BoostStrategy.encodeForDsProxyCall();
};

const createCompV3FLBoostL2Strategy = () => {
    const compV3FlBoostStrategy = new dfs.Strategy('CompV3FlBoostL2');
    addSubSlotsToCompV3Strategy(compV3FlBoostStrategy);

    compV3FlBoostStrategy.addTrigger(compV3Trigger);
    compV3FlBoostStrategy.addAction(compV3Actions.flAction('%baseToken', '%boostAmount'));
    compV3FlBoostStrategy.addAction(compV3Actions.sellAction('&baseToken', '%collToken', '%amount')); // variable amount from FL
    compV3FlBoostStrategy.addAction(compV3Actions.feeTakingAction('%collToken', '$2')); // pipe amount from sell
    compV3FlBoostStrategy.addAction(compV3Actions.supplyAction('$3')); // pipe amount from fee taking
    compV3FlBoostStrategy.addAction(compV3Actions.borrowAction('$1', '%flAddr')); // send back FL amount
    compV3FlBoostStrategy.addAction(compV3Actions.checkerAction());

    return compV3FlBoostStrategy.encodeForDsProxyCall();
};

const createAaveV3OpenOrderFromCollL2Strategy = () => {
    const aaveV3OpenOrderFromCollL2Strategy = new dfs.Strategy('AaveV3OpenOrderFromCollL2Strategy');

    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&collAsset', 'address');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&debtAsset', 'address');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&useOnBehalf', 'bool');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3OpenOrderFromCollL2Strategy.addTrigger(trigger);

    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '%useDefaultMarket', // hardcode to false
        '&marketAddr',
        '%amount', // amount to borrow, must stay variable, sent from backend
        '&proxy',
        '%rateMode', // hardcode to VARIABLE = 2
        '&debtAssetId',
        '&useOnBehalf',
        '%nullAddress',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&debtAsset',
            '&collAsset',
            '$1', // output of borrow action
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collAsset',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '%useDefaultMarket', // hardcode to false
        '&marketAddr',
        '$3', // output of gas fee taker action
        '&proxy',
        '&collAsset',
        '&collAssetId',
        '%enableAsColl', // hardcode to true
        '&useOnBehalf',
        '%nullAddress',
    );
    const openRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
    );
    aaveV3OpenOrderFromCollL2Strategy.addAction(borrowAction);
    aaveV3OpenOrderFromCollL2Strategy.addAction(sellAction);
    aaveV3OpenOrderFromCollL2Strategy.addAction(feeTakingAction);
    aaveV3OpenOrderFromCollL2Strategy.addAction(supplyAction);
    aaveV3OpenOrderFromCollL2Strategy.addAction(openRatioCheckAction);
    return aaveV3OpenOrderFromCollL2Strategy.encodeForDsProxyCall();
};
const createAaveV3FLOpenOrderFromCollL2Strategy = () => {
    const aaveV3OpenOrderFromCollL2Strategy = new dfs.Strategy('AaveV3FLOpenOrderFromCollL2Strategy');

    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&collAsset', 'address');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&debtAsset', 'address');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3OpenOrderFromCollL2Strategy.addSubSlot('&useOnBehalf', 'bool');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3OpenOrderFromCollL2Strategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%debtAsset'], // sent by backend
            ['%flAmount'], // sent by backend
            '%nullAddress',
            [],
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&debtAsset',
            '&collAsset',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collAsset',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '%useDefaultMarket', // hardcode to false
        '&marketAddr',
        '$3', // output of gas fee taker action
        '&proxy',
        '&collAsset',
        '&collAssetId',
        '%enableAsColl', // hardcode to true
        '&useOnBehalf',
        '%nullAddress',
    );
    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '%useDefaultMarket', // hardcode to false
        '&marketAddr',
        '$1',
        '%flAddress', // fl address, sent by backend
        '%rateMode', // hardcode to VARIABLE = 2
        '&debtAssetId',
        '&useOnBehalf',
        '%nullAddress',
    );
    const openRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
    );
    aaveV3OpenOrderFromCollL2Strategy.addAction(flAction);
    aaveV3OpenOrderFromCollL2Strategy.addAction(sellAction);
    aaveV3OpenOrderFromCollL2Strategy.addAction(feeTakingAction);
    aaveV3OpenOrderFromCollL2Strategy.addAction(supplyAction);
    aaveV3OpenOrderFromCollL2Strategy.addAction(borrowAction);
    aaveV3OpenOrderFromCollL2Strategy.addAction(openRatioCheckAction);
    return aaveV3OpenOrderFromCollL2Strategy.encodeForDsProxyCall();
};
const createAaveV3FLOpenOrderFromDebtL2Strategy = () => {
    const aaveV3OpenOrderFromDebtStrategy = new dfs.Strategy('AaveV3FLOpenOrderFromDebtL2Strategy');

    aaveV3OpenOrderFromDebtStrategy.addSubSlot('&collAsset', 'address');
    aaveV3OpenOrderFromDebtStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3OpenOrderFromDebtStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3OpenOrderFromDebtStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3OpenOrderFromDebtStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3OpenOrderFromDebtStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3OpenOrderFromDebtStrategy.addSubSlot('&useOnBehalf', 'bool');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3OpenOrderFromDebtStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%debtAsset'], // sent by backend
            ['%flAmount'], // sent by backend
            '%nullAddress',
            [],
        ),
    );
    const aaveV3WithdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%useDefaultMarket', // hardcode to false
        '&marketAddr',
        '%debtAssetAmount', // sent by backend
        '&proxy',
        '&debtAssetId',
    );
    const sumInputsAction = new dfs.actions.basic.SumInputsAction(
        '%flAmount', // sent by backend
        '$2', // output of withdraw action
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&debtAsset',
            '&collAsset',
            '$3', // output of sum inputs action
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collAsset',
        '$4', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '%useDefaultMarket', // hardcode to false
        '&marketAddr',
        '$5', // output of gas fee taker action
        '&proxy',
        '&collAsset',
        '&collAssetId',
        '%enableAsColl', // hardcode to true
        '&useOnBehalf',
        '%nullAddress',
    );
    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '%useDefaultMarket', // hardcode to false
        '&marketAddr',
        '$1',
        '%flAddress', // fl address, sent by backend
        '%rateMode', // hardcode to VARIABLE = 2
        '&debtAssetId',
        '&useOnBehalf',
        '%nullAddress',
    );
    const openRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
    );
    aaveV3OpenOrderFromDebtStrategy.addAction(flAction);
    aaveV3OpenOrderFromDebtStrategy.addAction(aaveV3WithdrawAction);
    aaveV3OpenOrderFromDebtStrategy.addAction(sumInputsAction);
    aaveV3OpenOrderFromDebtStrategy.addAction(sellAction);
    aaveV3OpenOrderFromDebtStrategy.addAction(feeTakingAction);
    aaveV3OpenOrderFromDebtStrategy.addAction(supplyAction);
    aaveV3OpenOrderFromDebtStrategy.addAction(borrowAction);
    aaveV3OpenOrderFromDebtStrategy.addAction(openRatioCheckAction);
    return aaveV3OpenOrderFromDebtStrategy.encodeForDsProxyCall();
};
const createMorphoBlueBoostL2Strategy = () => {
    const boostStrategy = new dfs.Strategy('MorphoBlueBoostL2Strategy');

    boostStrategy.addSubSlot('&loanToken', 'address');
    boostStrategy.addSubSlot('&collateralToken', 'address');
    boostStrategy.addSubSlot('&oracle', 'address');
    boostStrategy.addSubSlot('&irm', 'address');
    boostStrategy.addSubSlot('&lltv', 'uint256');
    boostStrategy.addSubSlot('&ratioState', 'uint8');
    boostStrategy.addSubSlot('&targetRatio', 'uint256');
    boostStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(
        0, nullAddress, 0, 0,
    );
    boostStrategy.addTrigger(morphoBlueRatioTrigger);

    const morphoBlueBorrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '%boostAmount', // sent by backend
        '&user',
        '&proxy',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&loanToken',
            '&collateralToken',
            '$1', // output of borrow action
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collateralToken',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // additional gas cost for L1
    );
    const supplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '$3', // output of fee taking action
        '&proxy',
        '&user',
    );
    const morphoBlueRatioCheckAction = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '&user',
        '&ratioState',
        '&targetRatio',
    );
    boostStrategy.addAction(morphoBlueBorrowAction);
    boostStrategy.addAction(sellAction);
    boostStrategy.addAction(feeTakingAction);
    boostStrategy.addAction(supplyAction);
    boostStrategy.addAction(morphoBlueRatioCheckAction);
    return boostStrategy.encodeForDsProxyCall();
};
const createMorphoBlueFLDebtBoostL2Strategy = () => {
    const boostStrategy = new dfs.Strategy('MorphoBlueFLDebtBoostL2Strategy');

    boostStrategy.addSubSlot('&loanToken', 'address');
    boostStrategy.addSubSlot('&collateralToken', 'address');
    boostStrategy.addSubSlot('&oracle', 'address');
    boostStrategy.addSubSlot('&irm', 'address');
    boostStrategy.addSubSlot('&lltv', 'uint256');
    boostStrategy.addSubSlot('&ratioState', 'uint8');
    boostStrategy.addSubSlot('&targetRatio', 'uint256');
    boostStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(
        0, nullAddress, 0, 0,
    );
    boostStrategy.addTrigger(morphoBlueRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%loanToken'], // sent by backend (no piping available in fl actions)
        ['%flAmount'], // sent by backend
        '%nullAddress',
        [],
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&loanToken',
            '&collateralToken',
            '%flAmount', // same number as fl amount, cant pipe fl output due to fee
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collateralToken',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // additional gas cost for L1
    );
    const morphoBlueSupplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '$3', // output of fee taking action
        '&proxy',
        '&user',
    );
    const morphoBlueBorrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '$1', // we borrow enough to payback flashloan
        '&user',
        '%flAddress', // sent by backend
    );
    const morphoBlueRatioCheckAction = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '&user',
        '&ratioState',
        '&targetRatio',
    );
    boostStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));
    boostStrategy.addAction(sellAction);
    boostStrategy.addAction(feeTakingAction);
    boostStrategy.addAction(morphoBlueSupplyAction);
    boostStrategy.addAction(morphoBlueBorrowAction);
    boostStrategy.addAction(morphoBlueRatioCheckAction);
    return boostStrategy.encodeForDsProxyCall();
};
const createMorphoBlueFLCollBoostL2Strategy = () => {
    const boostStrategy = new dfs.Strategy('MorphoBlueFLCollBoostL2Strategy');

    boostStrategy.addSubSlot('&loanToken', 'address');
    boostStrategy.addSubSlot('&collateralToken', 'address');
    boostStrategy.addSubSlot('&oracle', 'address');
    boostStrategy.addSubSlot('&irm', 'address');
    boostStrategy.addSubSlot('&lltv', 'uint256');
    boostStrategy.addSubSlot('&ratioState', 'uint8');
    boostStrategy.addSubSlot('&targetRatio', 'uint256');
    boostStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(
        0, nullAddress, 0, 0,
    );
    boostStrategy.addTrigger(morphoBlueRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%collateralToken'], // sent by backend (no piping available in fl actions)
        ['%flAmount'], // sent by backend
        '%nullAddress',
        [],
    );
    const morphoBlueSupplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '%flAmount', // sent by backend, should be the same as flashloan amount
        '&proxy',
        '&user',
    );
    const morphoBlueBorrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '%boostAmount', // sent by backend
        '&user',
        '&proxy',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&loanToken',
            '&collateralToken',
            '$3', // output of borrow action
            '%exchangeWrapper',
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collateralToken',
        '$4', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // additional gas cost for L1
    );
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        ['&collateralToken', '&collateralToken'],
        ['%flAddress', '&eoa'], // first one sent by backend, second piped
        ['$1', '%maxUint'], // first one piped to return fl, second one sent by backend
    );
    const morphoBlueRatioCheckAction = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '&user',
        '&ratioState',
        '&targetRatio',
    );
    boostStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));
    boostStrategy.addAction(morphoBlueSupplyAction);
    boostStrategy.addAction(morphoBlueBorrowAction);
    boostStrategy.addAction(sellAction);
    boostStrategy.addAction(feeTakingAction);
    boostStrategy.addAction(sendTokensAction);
    boostStrategy.addAction(morphoBlueRatioCheckAction);
    return boostStrategy.encodeForDsProxyCall();
};
const createMorphoBlueRepayL2Strategy = () => {
    const repayStrategy = new dfs.Strategy('MorphoBlueRepayL2Strategy');

    repayStrategy.addSubSlot('&loanToken', 'address');
    repayStrategy.addSubSlot('&collateralToken', 'address');
    repayStrategy.addSubSlot('&oracle', 'address');
    repayStrategy.addSubSlot('&irm', 'address');
    repayStrategy.addSubSlot('&lltv', 'uint256');
    repayStrategy.addSubSlot('&ratioState', 'uint8');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(
        0, nullAddress, 0, 0,
    );
    repayStrategy.addTrigger(morphoBlueRatioTrigger);

    const withdrawAction = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '%repayAmount', // sent by backend
        '&user',
        '&proxy',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collateralToken',
            '&loanToken',
            '$1', // output of withdraw action
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&loanToken',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // additional gas cost for L1
    );
    const paybackAction = new dfs.actions.morphoblue.MorphoBluePaybackAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '$3', // output of fee taking action
        '&proxy',
        '&user',
    );
    const morphoBlueRatioCheckAction = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '&user',
        '&ratioState',
        '&targetRatio',
    );

    repayStrategy.addAction(withdrawAction);
    repayStrategy.addAction(sellAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(paybackAction);
    repayStrategy.addAction(morphoBlueRatioCheckAction);
    return repayStrategy.encodeForDsProxyCall();
};
const createMorphoBlueFLCollRepayL2Strategy = () => {
    const repayStrategy = new dfs.Strategy('MorphoBlueFLCollRepayL2Strategy');

    repayStrategy.addSubSlot('&loanToken', 'address');
    repayStrategy.addSubSlot('&collateralToken', 'address');
    repayStrategy.addSubSlot('&oracle', 'address');
    repayStrategy.addSubSlot('&irm', 'address');
    repayStrategy.addSubSlot('&lltv', 'uint256');
    repayStrategy.addSubSlot('&ratioState', 'uint8');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(
        0, nullAddress, 0, 0,
    );
    repayStrategy.addTrigger(morphoBlueRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%collateralToken'], // sent by backend (no piping available in fl actions)
        ['%flAmount'], // sent by backend
        '%nullAddress',
        [],
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collateralToken',
            '&loanToken',
            '%repayAmount', // same as flamount, sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&loanToken',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // additional gas cost for L1
    );
    const paybackAction = new dfs.actions.morphoblue.MorphoBluePaybackAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '$3', // output of fee taking action
        '&proxy',
        '&user',
    );
    const withdrawAction = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '$1', // withdraw enough to payback flashloan
        '&user',
        '%flAddress', // sent by backend
    );
    const morphoBlueRatioCheckAction = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '&user',
        '&ratioState',
        '&targetRatio',
    );

    repayStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));
    repayStrategy.addAction(sellAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(paybackAction);
    repayStrategy.addAction(withdrawAction);
    repayStrategy.addAction(morphoBlueRatioCheckAction);
    return repayStrategy.encodeForDsProxyCall();
};
const createMorphoBlueFLDebtRepayL2Strategy = () => {
    const repayStrategy = new dfs.Strategy('MorphoBlueFLDebtRepayL2Strategy');

    repayStrategy.addSubSlot('&loanToken', 'address');
    repayStrategy.addSubSlot('&collateralToken', 'address');
    repayStrategy.addSubSlot('&oracle', 'address');
    repayStrategy.addSubSlot('&irm', 'address');
    repayStrategy.addSubSlot('&lltv', 'uint256');
    repayStrategy.addSubSlot('&ratioState', 'uint8');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(
        0, nullAddress, 0, 0,
    );
    repayStrategy.addTrigger(morphoBlueRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%debtToken'], // sent by backend (no piping available in fl actions)
        ['%flAmount'], // sent by backend
        '%nullAddress',
        [],
    );
    const paybackAction = new dfs.actions.morphoblue.MorphoBluePaybackAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '%repayAmount', // <- same as flAmount
        '&proxy',
        '&user',
    );
    const withdrawAction = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '%withdrawAmount', // sent by backend
        '&user',
        '&proxy',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collateralToken',
            '&loanToken',
            '$3', // output of withdraw action
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&loanToken',
        '$4', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // additional gas cost for L1
    );
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        ['&loanToken', '&loanToken'],
        ['%flAddress', '&eoa'], // first one sent by backend, second piped
        ['$1', '%maxUint'], // first one piped to return fl, second one sent by backend
    );
    const morphoBlueRatioCheckAction = new dfs.actions.checkers.MorphoBlueRatioCheckAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '&user',
        '&ratioState',
        '&targetRatio',
    );
    repayStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));
    repayStrategy.addAction(paybackAction);
    repayStrategy.addAction(withdrawAction);
    repayStrategy.addAction(sellAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(sendTokensAction);
    repayStrategy.addAction(morphoBlueRatioCheckAction);
    return repayStrategy.encodeForDsProxyCall();
};
const createMorphoBlueBoostOnTargetPriceL2Strategy = () => {
    const morphoBlueBoostOnTargetPriceStrategy = new dfs.Strategy('MorphoBlueBoostOnTargetPriceL2Strategy');

    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&loanToken', 'address');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&collateralToken', 'address');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&oracle', 'address');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&irm', 'address');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&lltv', 'uint256');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&user', 'address');

    const trigger = new dfs.triggers.MorphoBluePriceTrigger(
        '&loanToken', '&collateralToken', '&oracle', '&price', '&priceState',
    );
    morphoBlueBoostOnTargetPriceStrategy.addTrigger(trigger);

    const borrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '%amountToBorrow', // sent by backend
        '&user',
        '&proxy',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&loanToken',
            '&collateralToken',
            '$1',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collateralToken',
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send additional gas cost for L1
    );
    const supplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '$3',
        '&proxy',
        '&user',
    );
    const targetRatioCheckAction = new dfs.actions.checkers.MorphoBlueTargetRatioCheckAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '&user',
        '&targetRatio',
    );
    morphoBlueBoostOnTargetPriceStrategy.addAction(borrowAction);
    morphoBlueBoostOnTargetPriceStrategy.addAction(sellAction);
    morphoBlueBoostOnTargetPriceStrategy.addAction(feeTakingAction);
    morphoBlueBoostOnTargetPriceStrategy.addAction(supplyAction);
    morphoBlueBoostOnTargetPriceStrategy.addAction(targetRatioCheckAction);
    return morphoBlueBoostOnTargetPriceStrategy.encodeForDsProxyCall();
};
const createMorphoBlueFLBoostOnTargetPriceL2Strategy = () => {
    const morphoBlueFLBoostOnTargetPriceStrategy = new dfs.Strategy('MorphoBlueFLBoostOnTargetPriceL2Strategy');

    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&loanToken', 'address');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&collateralToken', 'address');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&oracle', 'address');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&irm', 'address');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&lltv', 'uint256');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&user', 'address');

    const trigger = new dfs.triggers.MorphoBluePriceTrigger(
        '&loanToken', '&collateralToken', '&oracle', '&price', '&priceState',
    );
    morphoBlueFLBoostOnTargetPriceStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['&loanToken'],
            ['%flAmount'], // sent by backend
            '%nullAddress',
            [],
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&loanToken',
            '&collateralToken',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collateralToken',
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send additional gas cost for L1
    );
    const supplyAction = new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '$3',
        '&proxy',
        '&user',
    );
    const borrowAction = new dfs.actions.morphoblue.MorphoBlueBorrowAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '$1',
        '&user',
        '%flAddress', // sent by backend
    );
    const targetRatioCheckAction = new dfs.actions.checkers.MorphoBlueTargetRatioCheckAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '&user',
        '&targetRatio',
    );
    morphoBlueFLBoostOnTargetPriceStrategy.addAction(flAction);
    morphoBlueFLBoostOnTargetPriceStrategy.addAction(sellAction);
    morphoBlueFLBoostOnTargetPriceStrategy.addAction(feeTakingAction);
    morphoBlueFLBoostOnTargetPriceStrategy.addAction(supplyAction);
    morphoBlueFLBoostOnTargetPriceStrategy.addAction(borrowAction);
    morphoBlueFLBoostOnTargetPriceStrategy.addAction(targetRatioCheckAction);
    return morphoBlueFLBoostOnTargetPriceStrategy.encodeForDsProxyCall();
};

const createAaveV3RepayOnPriceL2Strategy = () => {
    const aaveV3RepayOnPriceStrategy = new dfs.Strategy('AaveV3RepayOnPriceL2');

    aaveV3RepayOnPriceStrategy.addSubSlot('&collAsset', 'address');
    aaveV3RepayOnPriceStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3RepayOnPriceStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3RepayOnPriceStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3RepayOnPriceStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3RepayOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3RepayOnPriceStrategy.addSubSlot('&useOnBehalf', 'bool');

    const aaveV3Trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3RepayOnPriceStrategy.addTrigger(aaveV3Trigger);

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%useDefaultMarket',
        '&marketAddr',
        '%amount', // must stay variable
        '&proxy', // hardcoded
        '&collAssetId',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset',
            '$1', //  hardcoded piped from withdraw
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&debtAsset',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%useDefaultMarket',
        '&marketAddr',
        '$3', // amount hardcoded piped from fee taking
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '&debtAsset',
        '&debtAssetId',
        '&useOnBehalf', // hardcoded false
        '%onBehalf', // hardcoded 0 as its false
    );

    const checkerAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
    );

    aaveV3RepayOnPriceStrategy.addAction(withdrawAction);
    aaveV3RepayOnPriceStrategy.addAction(sellAction);
    aaveV3RepayOnPriceStrategy.addAction(feeTakingAction);
    aaveV3RepayOnPriceStrategy.addAction(paybackAction);
    aaveV3RepayOnPriceStrategy.addAction(checkerAction);

    return aaveV3RepayOnPriceStrategy.encodeForDsProxyCall();
};

const createAaveV3FlRepayOnPriceL2Strategy = () => {
    const aaveV3FlRepayOnPriceStrategy = new dfs.Strategy('AaveV3FlRepayOnPriceL2');

    aaveV3FlRepayOnPriceStrategy.addSubSlot('&collAsset', 'address');
    aaveV3FlRepayOnPriceStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3FlRepayOnPriceStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3FlRepayOnPriceStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3FlRepayOnPriceStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3FlRepayOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3FlRepayOnPriceStrategy.addSubSlot('&useOnBehalf', 'bool');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3FlRepayOnPriceStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['&collAsset'],
        ['%loanAmount'],
        nullAddress,
        [],
    );

    aaveV3FlRepayOnPriceStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset',
            '0', //  can't hard code because of fee
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&debtAsset',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%useDefaultMarket',
        '&marketAddr',
        '$3', // amount hardcoded output from fee taking
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '&debtAsset',
        '&debtAssetId',
        '&useOnBehalf', // hardcoded false
        '%onBehalf', // hardcoded 0 as its false
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%useDefaultMarket',
        '&marketAddr',
        '$1', // repay fl amount
        '%flAddr', // flAddr not hardcoded (tx will fail if not returned to correct addr)
        '&collAssetId',
    );

    const checkerAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
    );

    aaveV3FlRepayOnPriceStrategy.addAction(sellAction);
    aaveV3FlRepayOnPriceStrategy.addAction(feeTakingAction);
    aaveV3FlRepayOnPriceStrategy.addAction(paybackAction);
    aaveV3FlRepayOnPriceStrategy.addAction(withdrawAction);
    aaveV3FlRepayOnPriceStrategy.addAction(checkerAction);

    return aaveV3FlRepayOnPriceStrategy.encodeForDsProxyCall();
};
const createFluidT1RepayL2Strategy = () => {
    const fluidT1RepayStrategy = new dfs.Strategy('FluidT1RepayL2Strategy');
    fluidT1RepayStrategy.addSubSlot('&nftId', 'uint256');
    fluidT1RepayStrategy.addSubSlot('&vault', 'address');
    fluidT1RepayStrategy.addSubSlot('&ratioState', 'uint256');
    fluidT1RepayStrategy.addSubSlot('&targetRatio', 'uint256');
    fluidT1RepayStrategy.addSubSlot('&wrapEth', 'bool'); // hardcode to true

    const fluidRatioTrigger = new dfs.triggers.FluidRatioTrigger(
        'nftId',
        'ratio',
        'ratioState',
    );
    fluidT1RepayStrategy.addTrigger(fluidRatioTrigger);

    const fluidWithdrawAction = new dfs.actions.fluid.FluidVaultT1WithdrawAction(
        '&vault',
        '&nftId',
        '%amount', // sent by backend
        '&proxy',
        '&wrapEth',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collToken', // sent by backend. If collToken is ETH, pass WETH address
            '%debtToken', // sent by backend. If debtToken is ETH, pass WETH address
            '$1',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '%debtToken', // sent by backend. If debtToken is ETH, pass WETH address
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const fluidPaybackAction = new dfs.actions.fluid.FluidVaultT1PaybackAction(
        '&vault',
        '&nftId',
        '$3',
        '&proxy',
    );
    const fluidRatioCheckAction = new dfs.actions.checkers.FluidRatioCheckAction(
        '&nftId',
        '&ratioState',
        '&targetRatio',
    );
    fluidT1RepayStrategy.addAction(fluidWithdrawAction);
    fluidT1RepayStrategy.addAction(sellAction);
    fluidT1RepayStrategy.addAction(feeTakingAction);
    fluidT1RepayStrategy.addAction(fluidPaybackAction);
    fluidT1RepayStrategy.addAction(fluidRatioCheckAction);

    return fluidT1RepayStrategy.encodeForDsProxyCall();
};
const createFluidT1FLRepayL2Strategy = () => {
    const fluidT1FLRepayStrategy = new dfs.Strategy('FluidT1FLRepayL2Strategy');
    fluidT1FLRepayStrategy.addSubSlot('&nftId', 'uint256');
    fluidT1FLRepayStrategy.addSubSlot('&vault', 'address');
    fluidT1FLRepayStrategy.addSubSlot('&ratioState', 'uint256');
    fluidT1FLRepayStrategy.addSubSlot('&targetRatio', 'uint256');
    fluidT1FLRepayStrategy.addSubSlot('&wrapEth', 'bool'); // hardcode to true
    fluidT1FLRepayStrategy.addSubSlot('&CollActionType.WITHDRAW', 'uint8');
    fluidT1FLRepayStrategy.addSubSlot('&DebtActionType.PAYBACK', 'uint8');

    const fluidRatioTrigger = new dfs.triggers.FluidRatioTrigger(
        'nftId',
        'ratio',
        'ratioState',
    );
    fluidT1FLRepayStrategy.addTrigger(fluidRatioTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collToken'], // sent by backend. If collToken is ETH, pass WETH address
            ['%flAmount'], // sent by backend
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collToken', // sent by backend. If collToken is ETH, pass WETH address
            '%debtToken', // sent by backend. If debtToken is ETH, pass WETH address
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gas', // sent by backend
        '%debtToken', // sent by backend. If debtToken is ETH, pass WETH address
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const fluidAdjustAction = new dfs.actions.fluid.FluidVaultT1AdjustAction(
        '&vault',
        '&nftId',
        '$1',
        '$3',
        '&proxy',
        '%flAddress', // sent by backend
        '&wrapEth',
        '&CollActionType.WITHDRAW',
        '&DebtActionType.PAYBACK',
    );
    const fluidRatioCheckAction = new dfs.actions.checkers.FluidRatioCheckAction(
        '&nftId',
        '&ratioState',
        '&targetRatio',
    );
    fluidT1FLRepayStrategy.addAction(flAction);
    fluidT1FLRepayStrategy.addAction(sellAction);
    fluidT1FLRepayStrategy.addAction(feeTakingAction);
    fluidT1FLRepayStrategy.addAction(fluidAdjustAction);
    fluidT1FLRepayStrategy.addAction(fluidRatioCheckAction);

    return fluidT1FLRepayStrategy.encodeForDsProxyCall();
};
const createFluidT1BoostL2Strategy = () => {
    const fluidT1BoostStrategy = new dfs.Strategy('FluidT1BoostL2Strategy');
    fluidT1BoostStrategy.addSubSlot('&nftId', 'uint256');
    fluidT1BoostStrategy.addSubSlot('&vault', 'address');
    fluidT1BoostStrategy.addSubSlot('&ratioState', 'uint256');
    fluidT1BoostStrategy.addSubSlot('&targetRatio', 'uint256');
    fluidT1BoostStrategy.addSubSlot('&wrapEth', 'bool'); // hardcode to true

    const fluidRatioTrigger = new dfs.triggers.FluidRatioTrigger(
        'nftId',
        'ratio',
        'ratioState',
    );
    fluidT1BoostStrategy.addTrigger(fluidRatioTrigger);

    const fluidBorrowAction = new dfs.actions.fluid.FluidVaultT1BorrowAction(
        '&vault',
        '&nftId',
        '%amount', // sent by backend
        '&proxy',
        '&wrapEth',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%debtToken', // sent by backend. If debtToken is ETH, pass WETH address
            '%collToken', // sent by backend. If collToken is ETH, pass WETH address
            '$1',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gas', // sent by backend
        '%collToken', // sent by backend. If collToken is ETH, pass WETH address
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const fluidSupplyAction = new dfs.actions.fluid.FluidVaultT1SupplyAction(
        '&vault',
        '&nftId',
        '$3',
        '&proxy',
    );
    const fluidRatioCheckAction = new dfs.actions.checkers.FluidRatioCheckAction(
        '&nftId',
        '&ratioState',
        '&targetRatio',
    );
    fluidT1BoostStrategy.addAction(fluidBorrowAction);
    fluidT1BoostStrategy.addAction(sellAction);
    fluidT1BoostStrategy.addAction(feeTakingAction);
    fluidT1BoostStrategy.addAction(fluidSupplyAction);
    fluidT1BoostStrategy.addAction(fluidRatioCheckAction);

    return fluidT1BoostStrategy.encodeForDsProxyCall();
};
const createFluidT1FLBoostL2Strategy = () => {
    const fluidT1FLBoostStrategy = new dfs.Strategy('FluidT1FLBoostL2Strategy');
    fluidT1FLBoostStrategy.addSubSlot('&nftId', 'uint256');
    fluidT1FLBoostStrategy.addSubSlot('&vault', 'address');
    fluidT1FLBoostStrategy.addSubSlot('&ratioState', 'uint256');
    fluidT1FLBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    fluidT1FLBoostStrategy.addSubSlot('&wrapEth', 'bool'); // hardcode to true
    fluidT1FLBoostStrategy.addSubSlot('&CollActionType.SUPPLY', 'uint8');
    fluidT1FLBoostStrategy.addSubSlot('&DebtActionType.BORROW', 'uint8');

    const fluidRatioTrigger = new dfs.triggers.FluidRatioTrigger(
        'nftId',
        'ratio',
        'ratioState',
    );
    fluidT1FLBoostStrategy.addTrigger(fluidRatioTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%debtToken'], // sent by backend. If debtToken is ETH, pass WETH address
            ['%flAmount'], // sent by backend
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%debtToken', // sent by backend. If debtToken is ETH, pass WETH address
            '%collToken', // sent by backend. If collToken is ETH, pass WETH address
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gas', // sent by backend
        '%collToken', // sent by backend. If collToken is ETH, pass WETH address
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const fluidAdjustAction = new dfs.actions.fluid.FluidVaultT1AdjustAction(
        '&vault',
        '&nftId',
        '$3',
        '$1',
        '&proxy',
        '%flAddress', // sent by backend
        '&wrapEth',
        '&CollActionType.SUPPLY',
        '&DebtActionType.BORROW',
    );
    const fluidRatioCheckAction = new dfs.actions.checkers.FluidRatioCheckAction(
        '&nftId',
        '&ratioState',
        '&targetRatio',
    );
    fluidT1FLBoostStrategy.addAction(flAction);
    fluidT1FLBoostStrategy.addAction(sellAction);
    fluidT1FLBoostStrategy.addAction(feeTakingAction);
    fluidT1FLBoostStrategy.addAction(fluidAdjustAction);
    fluidT1FLBoostStrategy.addAction(fluidRatioCheckAction);

    return fluidT1FLBoostStrategy.encodeForDsProxyCall();
};

const createCompV3BoostOnPriceL2Strategy = () => {
    const compV3BoostOnPriceL2Strategy = new dfs.Strategy('CompV3BoostOnPriceL2Strategy');
    compV3BoostOnPriceL2Strategy.addSubSlot('&market', 'address');
    compV3BoostOnPriceL2Strategy.addSubSlot('&collToken', 'address');
    compV3BoostOnPriceL2Strategy.addSubSlot('&baseToken', 'address');
    compV3BoostOnPriceL2Strategy.addSubSlot('&targetRatio', 'uint256');
    compV3BoostOnPriceL2Strategy.addSubSlot('&ratioState', 'uint8');
    compV3BoostOnPriceL2Strategy.addSubSlot('&user', 'address');

    const compV3PriceTrigger = new dfs.triggers.CompV3PriceTrigger(nullAddress, nullAddress, nullAddress, 0, 0);
    compV3BoostOnPriceL2Strategy.addTrigger(compV3PriceTrigger);

    const compV3BorrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
        '&market',
        '%amount', // amount to borrow, sent by backend
        '&proxy',
        '&user',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&baseToken',
            '&collToken',
            '$1',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collToken',
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        '&market',
        '&collToken',
        '$3',
        '&proxy',
        '&user',
    );
    const compV3RatioCheckAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
        '&user',
    );
    compV3BoostOnPriceL2Strategy.addAction(compV3BorrowAction);
    compV3BoostOnPriceL2Strategy.addAction(sellAction);
    compV3BoostOnPriceL2Strategy.addAction(feeTakingAction);
    compV3BoostOnPriceL2Strategy.addAction(supplyAction);
    compV3BoostOnPriceL2Strategy.addAction(compV3RatioCheckAction);

    return compV3BoostOnPriceL2Strategy.encodeForDsProxyCall();
};
const createCompV3FLBoostOnPriceL2Strategy = () => {
    const compV3FLBoostOnPriceL2Strategy = new dfs.Strategy('CompV3FLBoostOnPriceL2Strategy');
    compV3FLBoostOnPriceL2Strategy.addSubSlot('&market', 'address');
    compV3FLBoostOnPriceL2Strategy.addSubSlot('&collToken', 'address');
    compV3FLBoostOnPriceL2Strategy.addSubSlot('&baseToken', 'address');
    compV3FLBoostOnPriceL2Strategy.addSubSlot('&targetRatio', 'uint256');
    compV3FLBoostOnPriceL2Strategy.addSubSlot('&ratioState', 'uint8');
    compV3FLBoostOnPriceL2Strategy.addSubSlot('&user', 'address');

    const compV3PriceTrigger = new dfs.triggers.CompV3PriceTrigger(nullAddress, nullAddress, nullAddress, 0, 0);
    compV3FLBoostOnPriceL2Strategy.addTrigger(compV3PriceTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%baseToken'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&baseToken',
            '&collToken',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collToken',
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        '&market',
        '&collToken',
        '$3',
        '&proxy',
        '&user',
    );
    const compV3BorrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
        '&market',
        '$1',
        '%flAddress', // sent by backend
        '&user',
    );
    const compV3RatioCheckAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
        '&user',
    );
    compV3FLBoostOnPriceL2Strategy.addAction(flAction);
    compV3FLBoostOnPriceL2Strategy.addAction(sellAction);
    compV3FLBoostOnPriceL2Strategy.addAction(feeTakingAction);
    compV3FLBoostOnPriceL2Strategy.addAction(supplyAction);
    compV3FLBoostOnPriceL2Strategy.addAction(compV3BorrowAction);
    compV3FLBoostOnPriceL2Strategy.addAction(compV3RatioCheckAction);

    return compV3FLBoostOnPriceL2Strategy.encodeForDsProxyCall();
};

const createCompV3RepayOnPriceL2Strategy = () => {
    const compV3RepayOnPriceL2Strategy = new dfs.Strategy('CompV3RepayOnPriceL2Strategy');
    compV3RepayOnPriceL2Strategy.addSubSlot('&market', 'address');
    compV3RepayOnPriceL2Strategy.addSubSlot('&collToken', 'address');
    compV3RepayOnPriceL2Strategy.addSubSlot('&baseToken', 'address');
    compV3RepayOnPriceL2Strategy.addSubSlot('&targetRatio', 'uint256');
    compV3RepayOnPriceL2Strategy.addSubSlot('&ratioState', 'uint8');
    compV3RepayOnPriceL2Strategy.addSubSlot('&user', 'address');

    const compV3PriceTrigger = new dfs.triggers.CompV3PriceTrigger(nullAddress, nullAddress, nullAddress, 0, 0);
    compV3RepayOnPriceL2Strategy.addTrigger(compV3PriceTrigger);

    const compV3WithdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        '&market',
        '&proxy',
        '&collToken',
        '%amount', // sent by backend
        '&user',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collToken',
            '&baseToken',
            '$1',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&baseToken',
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const compV3PaybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market',
        '$3',
        '&proxy',
        '&user',
        '&baseToken',
    );
    const compV3RatioCheckAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
        '&user',
    );
    compV3RepayOnPriceL2Strategy.addAction(compV3WithdrawAction);
    compV3RepayOnPriceL2Strategy.addAction(sellAction);
    compV3RepayOnPriceL2Strategy.addAction(feeTakingAction);
    compV3RepayOnPriceL2Strategy.addAction(compV3PaybackAction);
    compV3RepayOnPriceL2Strategy.addAction(compV3RatioCheckAction);

    return compV3RepayOnPriceL2Strategy.encodeForDsProxyCall();
};
const createCompV3FLRepayOnPriceL2Strategy = () => {
    const compV3FLRepayOnPriceL2Strategy = new dfs.Strategy('CompV3FLRepayOnPriceL2Strategy');
    compV3FLRepayOnPriceL2Strategy.addSubSlot('&market', 'address');
    compV3FLRepayOnPriceL2Strategy.addSubSlot('&collToken', 'address');
    compV3FLRepayOnPriceL2Strategy.addSubSlot('&baseToken', 'address');
    compV3FLRepayOnPriceL2Strategy.addSubSlot('&targetRatio', 'uint256');
    compV3FLRepayOnPriceL2Strategy.addSubSlot('&ratioState', 'uint8');
    compV3FLRepayOnPriceL2Strategy.addSubSlot('&user', 'address');

    const compV3PriceTrigger = new dfs.triggers.CompV3PriceTrigger(nullAddress, nullAddress, nullAddress, 0, 0);
    compV3FLRepayOnPriceL2Strategy.addTrigger(compV3PriceTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collToken'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collToken',
            '&baseToken',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&baseToken',
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const compV3PaybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market',
        '$3',
        '&proxy',
        '&user',
        '&baseToken',
    );
    const compV3WithdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        '&market',
        '%flAddress', // sent by backend
        '&collToken',
        '$1',
        '&user',
    );
    const compV3RatioCheckAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
        '&user',
    );
    compV3FLRepayOnPriceL2Strategy.addAction(flAction);
    compV3FLRepayOnPriceL2Strategy.addAction(sellAction);
    compV3FLRepayOnPriceL2Strategy.addAction(feeTakingAction);
    compV3FLRepayOnPriceL2Strategy.addAction(compV3PaybackAction);
    compV3FLRepayOnPriceL2Strategy.addAction(compV3WithdrawAction);
    compV3FLRepayOnPriceL2Strategy.addAction(compV3RatioCheckAction);

    return compV3FLRepayOnPriceL2Strategy.encodeForDsProxyCall();
};

const createCompV3FLCloseToDebtL2Strategy = () => {
    const compV3FLCloseToDebtL2Strategy = new dfs.Strategy('CompV3FLCloseToDebtL2Strategy');
    compV3FLCloseToDebtL2Strategy.addSubSlot('&market', 'address');
    compV3FLCloseToDebtL2Strategy.addSubSlot('&collToken', 'address');
    compV3FLCloseToDebtL2Strategy.addSubSlot('&baseToken', 'address');
    compV3FLCloseToDebtL2Strategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8'); // only used by backend to determine which action to call
    compV3FLCloseToDebtL2Strategy.addSubSlot('&user', 'address');

    const compV3ClosePriceRangeTrigger = new dfs.triggers.CompV3PriceRangeTrigger(nullAddress, nullAddress, 0, 0);
    compV3FLCloseToDebtL2Strategy.addTrigger(compV3ClosePriceRangeTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%baseToken'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );
    const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market',
        '%flAmount', // sent by backend
        '&proxy',
        '&user',
        '&baseToken',
    );
    const withdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        '&market',
        '&proxy',
        '&collToken',
        '%amount', // sent by backend. MaxUint256 for full balance withdraw
        '&user',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collToken',
            '&baseToken',
            '$3',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&baseToken',
        '$4',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    // return:
    // 1. Send baseToken flashloan amount to flAddress
    // 2. Send all baseToken's left after the close and flRepayment to eoa
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        [
            '&baseToken',
            '&baseToken',
        ],
        [
            '%flAddress', // sent by backend
            '&eoa',
        ],
        [
            '$1',
            '%max(uint)', // sent by backend
        ],
    );

    compV3FLCloseToDebtL2Strategy.addAction(flAction);
    compV3FLCloseToDebtL2Strategy.addAction(paybackAction);
    compV3FLCloseToDebtL2Strategy.addAction(withdrawAction);
    compV3FLCloseToDebtL2Strategy.addAction(sellAction);
    compV3FLCloseToDebtL2Strategy.addAction(feeTakingAction);
    compV3FLCloseToDebtL2Strategy.addAction(sendTokensAction);

    return compV3FLCloseToDebtL2Strategy.encodeForDsProxyCall();
};
const createCompV3FLCloseToCollL2Strategy = () => {
    const compV3FLCloseToCollL2Strategy = new dfs.Strategy('CompV3FLCloseToCollL2Strategy');
    compV3FLCloseToCollL2Strategy.addSubSlot('&market', 'address');
    compV3FLCloseToCollL2Strategy.addSubSlot('&collToken', 'address');
    compV3FLCloseToCollL2Strategy.addSubSlot('&baseToken', 'address');
    compV3FLCloseToCollL2Strategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8'); // only used by backend to determine which action to call
    compV3FLCloseToCollL2Strategy.addSubSlot('&user', 'address');

    const compV3ClosePriceRangeTrigger = new dfs.triggers.CompV3PriceRangeTrigger(nullAddress, nullAddress, 0, 0);
    compV3FLCloseToCollL2Strategy.addTrigger(compV3ClosePriceRangeTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collToken'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collToken',
            '&baseToken',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market',
        '$2',
        '&proxy',
        '&user',
        '&baseToken',
    );
    const withdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        '&market',
        '&proxy',
        '&collToken',
        '%amount', // sent by backend. MaxUint256 for full balance withdraw
        '&user',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collToken',
        '$4',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    // return:
    // 1. Send collToken flashloan amount to flAddress
    // 2. Send all collToken's left after the close and flRepayment to eoa
    // 3. Send all baseToken's left after the close and flRepayment to eoa
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        [
            '&collToken',
            '&collToken',
            '&baseToken',
        ],
        [
            '%flAddress', // sent by backend
            '&eoa',
            '&eoa',
        ],
        [
            '$1',
            '%max(uint)', // sent by backend
            '%max(uint)', // sent by backend
        ],
    );

    compV3FLCloseToCollL2Strategy.addAction(flAction);
    compV3FLCloseToCollL2Strategy.addAction(sellAction);
    compV3FLCloseToCollL2Strategy.addAction(paybackAction);
    compV3FLCloseToCollL2Strategy.addAction(withdrawAction);
    compV3FLCloseToCollL2Strategy.addAction(feeTakingAction);
    compV3FLCloseToCollL2Strategy.addAction(sendTokensAction);

    return compV3FLCloseToCollL2Strategy.encodeForDsProxyCall();
};

const createCompV3EOARepayL2Strategy = () => {
    const compV3RepayStrategy = new dfs.Strategy('CompV3EOARepayL2Strategy');

    compV3RepayStrategy.addSubSlot('&market', 'address');
    compV3RepayStrategy.addSubSlot('&baseToken', 'address');
    compV3RepayStrategy.addSubSlot('&ratioState', 'uint256');
    compV3RepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const trigger = new dfs.triggers.CompV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    compV3RepayStrategy.addTrigger(trigger);

    const withdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        '&market',
        '&proxy',
        '%collAddr', // variable token to withdraw
        '%amount', // variable amount to withdraw
        '&eoa',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '&baseToken',
            '$1',
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&baseToken',
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market',
        '$3',
        '&proxy',
        '&eoa',
        placeHolderAddr,
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
        '&eoa',
    );

    compV3RepayStrategy.addAction(withdrawAction);
    compV3RepayStrategy.addAction(sellAction);
    compV3RepayStrategy.addAction(feeTakingAction);
    compV3RepayStrategy.addAction(paybackAction);
    compV3RepayStrategy.addAction(checkerAction);

    return compV3RepayStrategy.encodeForDsProxyCall();
};
const createCompV3EOAFlRepayL2Strategy = () => {
    const compV3RepayStrategy = new dfs.Strategy('CompV3EOAFlRepayL2Strategy');

    compV3RepayStrategy.addSubSlot('&market', 'address');
    compV3RepayStrategy.addSubSlot('&baseToken', 'address');
    compV3RepayStrategy.addSubSlot('&ratioState', 'uint256');
    compV3RepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const trigger = new dfs.triggers.CompV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    compV3RepayStrategy.addTrigger(trigger);

    const flBalancer = new dfs.actions.flashloan.BalancerFlashLoanAction(['%collAddr'], ['%repayAmount']);
    const flAction = new dfs.actions.flashloan.FLAction(flBalancer);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '&baseToken',
            '%amount',
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&baseToken',
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market',
        '$3',
        '&proxy',
        '&eoa',
        placeHolderAddr,
    );

    const withdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        '&market',
        '%flAddr', // hardcoded
        '%collAddr', // variable token to withdraw
        '$1',
        '&eoa',
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
        '&eoa',
    );

    compV3RepayStrategy.addAction(flAction);
    compV3RepayStrategy.addAction(sellAction);
    compV3RepayStrategy.addAction(feeTakingAction);
    compV3RepayStrategy.addAction(paybackAction);
    compV3RepayStrategy.addAction(withdrawAction);
    compV3RepayStrategy.addAction(checkerAction);

    return compV3RepayStrategy.encodeForDsProxyCall();
};
const createCompV3EOABoostL2Strategy = () => {
    const compV3BoostStrategy = new dfs.Strategy('CompV3EOABoostL2Strategy');

    compV3BoostStrategy.addSubSlot('&market', 'address');
    compV3BoostStrategy.addSubSlot('&baseToken', 'address');
    compV3BoostStrategy.addSubSlot('&ratioState', 'uint256');
    compV3BoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const trigger = new dfs.triggers.CompV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    compV3BoostStrategy.addTrigger(trigger);

    const borrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
        '&market',
        '%amount', // variable amount to borrow
        '&proxy',
        '&eoa',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&baseToken',
            '%collToken', // must stay variable
            '$1',
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '%collToken', // must stay variable
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        '&market',
        '%collAsset', // variable coll token
        '$3',
        '&proxy',
        '&eoa',
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
        '&eoa',
    );

    compV3BoostStrategy.addAction(borrowAction);
    compV3BoostStrategy.addAction(sellAction);
    compV3BoostStrategy.addAction(feeTakingAction);
    compV3BoostStrategy.addAction(supplyAction);
    compV3BoostStrategy.addAction(checkerAction);

    return compV3BoostStrategy.encodeForDsProxyCall();
};
const createCompV3EOAFlBoostL2Strategy = () => {
    const compV3BoostStrategy = new dfs.Strategy('CompV3EOAFLBoostL2Strategy');

    compV3BoostStrategy.addSubSlot('&market', 'address');
    compV3BoostStrategy.addSubSlot('&baseToken', 'address');
    compV3BoostStrategy.addSubSlot('&ratioState', 'uint256');
    compV3BoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const trigger = new dfs.triggers.CompV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    compV3BoostStrategy.addTrigger(trigger);

    const flBalancer = new dfs.actions.flashloan.BalancerFlashLoanAction(['%baseToken'], ['%boostAmount']);
    const flAction = new dfs.actions.flashloan.FLAction(flBalancer);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&baseToken',
            '%collToken', // must stay variable
            '%amount', //  variable amount from Fl
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '%collToken', // must stay variable
        '$2',
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        '&market',
        '%collAsset', // variable coll token
        '$3',
        '&proxy',
        '&eoa',
    );

    const borrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
        '&market',
        '$1',
        '%flAddr', // variable flAddr
        '&eoa',
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
        '&eoa',
    );

    compV3BoostStrategy.addAction(flAction);
    compV3BoostStrategy.addAction(sellAction);
    compV3BoostStrategy.addAction(feeTakingAction);
    compV3BoostStrategy.addAction(supplyAction);
    compV3BoostStrategy.addAction(borrowAction);
    compV3BoostStrategy.addAction(checkerAction);

    return compV3BoostStrategy.encodeForDsProxyCall();
};

const createAaveV3EOABoostL2Strategy = () => {
    const aaveV3EOABoostL2Strategy = new dfs.Strategy('AaveV3EOABoostL2');

    aaveV3EOABoostL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3EOABoostL2Strategy.addSubSlot('&checkBoostState', 'uint256');
    aaveV3EOABoostL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3EOABoostL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3EOABoostL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3EOABoostL2Strategy.addSubSlot('&onBehalfAddr', 'address');

    const aaveV3Trigger = new dfs.triggers.CompV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3EOABoostL2Strategy.addTrigger(aaveV3Trigger);

    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '&useDefaultMarket', // hardcoded to false
        '&marketAddr', // marketAddr from subData
        '%amount', // must stay variable
        '&proxy', // hardcoded
        '%rateMode', // depends on type of debt we want
        '%assetId', // must stay variable can choose diff. asset
        '&useOnBehalf', // set to true hardcoded
        '&onBehalfAddr', // EOA addr
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
        '&useDefaultMarket', // hardcoded to false
        '&market', // marketAddr from subData
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%collAddr', // is variable as it can change
        '%assetId', // must be variable
        '%enableAsColl', // hardcoded always enable as coll
        '&useOnBehalf', // hardcoded true
        '%onBehalfAddr', // EOA addr
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkBoostState',
        '&targetRatio',
        '&marketAddr',
        '&onBehalfAddr',
    );

    aaveV3EOABoostL2Strategy.addAction(borrowAction);
    aaveV3EOABoostL2Strategy.addAction(sellAction);
    aaveV3EOABoostL2Strategy.addAction(feeTakingAction);
    aaveV3EOABoostL2Strategy.addAction(supplyAction);
    aaveV3EOABoostL2Strategy.addAction(checkerAction);

    return aaveV3EOABoostL2Strategy.encodeForDsProxyCall();
};

const createAaveV3EOAFLBoostL2Strategy = () => {
    const aaveV3EOAFLBoostL2Strategy = new dfs.Strategy('AaveV3EOAFLBoostL2');

    aaveV3EOAFLBoostL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3EOAFLBoostL2Strategy.addSubSlot('&checkBoostState', 'uint256');
    aaveV3EOAFLBoostL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3EOAFLBoostL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3EOAFLBoostL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3EOAFLBoostL2Strategy.addSubSlot('&onBehalfAddr', 'address');

    const aaveV3Trigger = new dfs.triggers.CompV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3EOAFLBoostL2Strategy.addTrigger(aaveV3Trigger);

    const flAction = new dfs.actions.flashloan.AaveV3FlashLoanAction(
        ['%collAsset'],
        ['%repayAmount'],
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
        '&useDefaultMarket', // hardcoded to false
        '&market', // marketAddr from subData
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%collAddr', // is variable as it can change
        '%assetId', // must be variable
        '%enableAsColl', // backend - hardcoded always enable as coll
        '&useOnBehalf', // hardcoded true use on behalf
        '&onBehalfAddr', // EOA addr
    );

    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '&useDefaultMarket', // hardcoded to false
        '&marketAddr', // hardcoded because default market is true
        '$1', // from Fl amount
        '%flAddr', // fl address that can change
        '%rateMode', // depends on type of debt we want
        '%assetId', // must stay variable can choose diff. asset
        '&useOnBehalf', // set to true hardcoded
        '&onBehalfAddr', // EOA addr
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkBoostState',
        '&targetRatio',
        '&marketAddr',
        '&onBehalfAddr',
    );

    aaveV3EOAFLBoostL2Strategy.addAction(flAction);
    aaveV3EOAFLBoostL2Strategy.addAction(sellAction);
    aaveV3EOAFLBoostL2Strategy.addAction(feeTakingAction);
    aaveV3EOAFLBoostL2Strategy.addAction(supplyAction);
    aaveV3EOAFLBoostL2Strategy.addAction(borrowAction);
    aaveV3EOAFLBoostL2Strategy.addAction(checkerAction);

    return aaveV3EOAFLBoostL2Strategy.encodeForDsProxyCall();
};

const createAaveV3EOARepayL2Strategy = () => {
    const aaveV3EOARepayL2Strategy = new dfs.Strategy('AaveV3EOARepayL2');

    aaveV3EOARepayL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3EOARepayL2Strategy.addSubSlot('&checkRepayState', 'uint256');
    aaveV3EOARepayL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3EOARepayL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3EOARepayL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3EOARepayL2Strategy.addSubSlot('&onBehalfAddr', 'address');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3EOARepayL2Strategy.addTrigger(aaveV3Trigger);

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '&useDefaultMarket', // set to false hardcoded
        '&marketAddr', // marketAddr from subData
        '%amount', // must stay variable
        '&proxy', // hardcoded
        '%assetId', // must stay variable can choose diff. asset
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
        '&useDefaultMarket', // set to false hardcoded
        '&marketAddr', // marketAddr from subData
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '%debtAddr', // used just for sdk not actually sent (should this be here?) . Same comment is in 1st strategy in this file, should resolve this
        '%assetId', // must be variable
        '&useOnBehalf', // hardcoded true
        '&onBehalfAddr', // EOA addr
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkRepayState',
        '&targetRatio',
        '&marketAddr',
        '&onBehalfAddr',
    );

    aaveV3EOARepayL2Strategy.addAction(withdrawAction);
    aaveV3EOARepayL2Strategy.addAction(sellAction);
    aaveV3EOARepayL2Strategy.addAction(feeTakingAction);
    aaveV3EOARepayL2Strategy.addAction(paybackAction);
    aaveV3EOARepayL2Strategy.addAction(checkerAction);

    return aaveV3EOARepayL2Strategy.encodeForDsProxyCall();
};

const createAaveV3EOAFLRepayL2Strategy = () => {
    const aaveV3EOAFLRepayL2Strategy = new dfs.Strategy('AaveV3EOAFLRepayL2');

    aaveV3EOAFLRepayL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3EOAFLRepayL2Strategy.addSubSlot('&checkRepayState', 'uint256');
    aaveV3EOAFLRepayL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3EOAFLRepayL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3EOAFLRepayL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3EOAFLRepayL2Strategy.addSubSlot('&onBehalfAddr', 'address');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3EOAFLRepayL2Strategy.addTrigger(aaveV3Trigger);

    const flAction = new dfs.actions.flashloan.AaveV3FlashLoanAction(
        ['%collAsset'],
        ['%repayAmount'],
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
        '&useDefaultMarket', // set to false hardcoded
        '&marketAddr', // marketAddr from subData
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '%debtAddr', // used just for sdk not actually sent (should this be here?)
        '%assetId', // must be variable
        '&useOnBehalf', // hardcoded true
        '&onBehalf', // EOA addr
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '&useDefaultMarket', // set to false hardcoded
        '&market', // marketAddr from subData
        '$1', // repay fl amount
        '%flAddr', // flAddr not hardcoded (tx will fail if not returned to correct addr)
        '%assetId', // must stay variable can choose diff. asset
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkRepayState',
        '&targetRatio',
        '&marketAddr',
        '&onBehalfAddr',
    );

    aaveV3EOAFLRepayL2Strategy.addAction(flAction);
    aaveV3EOAFLRepayL2Strategy.addAction(sellAction);
    aaveV3EOAFLRepayL2Strategy.addAction(feeTakingAction);
    aaveV3EOAFLRepayL2Strategy.addAction(paybackAction);
    aaveV3EOAFLRepayL2Strategy.addAction(withdrawAction);
    aaveV3EOAFLRepayL2Strategy.addAction(checkerAction);

    return aaveV3EOAFLRepayL2Strategy.encodeForDsProxyCall();
};

const createAaveV3EOABoostOnPriceL2Strategy = () => {
    const aaveV3EOABoostOnPriceL2Strategy = new dfs.Strategy('AaveV3EOABoostOnPriceL2Strategy');

    aaveV3EOABoostOnPriceL2Strategy.addSubSlot('&collAsset', 'address');
    aaveV3EOABoostOnPriceL2Strategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3EOABoostOnPriceL2Strategy.addSubSlot('&debtAsset', 'address');
    aaveV3EOABoostOnPriceL2Strategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3EOABoostOnPriceL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3EOABoostOnPriceL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3EOABoostOnPriceL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3EOABoostOnPriceL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3EOABoostOnPriceL2Strategy.addSubSlot('&onBehalfAddr', 'address');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3EOABoostOnPriceL2Strategy.addTrigger(trigger);

    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '&useDefaultMarket', // hardcode to false
        '&marketAddr', // marketAddr
        '%amount', // amount to borrow, must stay variable, sent from backend
        '&proxy',
        '%rateMode', // hardcode to VARIABLE = 2
        '&debtAssetId',
        '&useOnBehalf', // hardcoded to true
        '&onBehalfAddr', // EOA addr from subData
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&debtAsset',
            '&collAsset',
            '$1', // output of borrow action
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collAsset',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '&useDefaultMarket', // hardcode to false
        '&marketAddr',
        '$3', // output of gas fee taker action
        '&proxy',
        '&collAsset',
        '&collAssetId',
        '%enableAsColl', // hardcode to true
        '&useOnBehalf', // hardcode to true
        '&onBehalfAddr', // EOA addr from subData
    );
    const openRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
        '&onBehalfAddr',
    );
    aaveV3EOABoostOnPriceL2Strategy.addAction(borrowAction);
    aaveV3EOABoostOnPriceL2Strategy.addAction(sellAction);
    aaveV3EOABoostOnPriceL2Strategy.addAction(feeTakingAction);
    aaveV3EOABoostOnPriceL2Strategy.addAction(supplyAction);
    aaveV3EOABoostOnPriceL2Strategy.addAction(openRatioCheckAction);
    return aaveV3EOABoostOnPriceL2Strategy.encodeForDsProxyCall();
};

const createAaveV3EOAFLBoostOnPriceL2Strategy = () => {
    const aaveV3EOAFLBoostOnPriceL2Strategy = new dfs.Strategy('AaveV3FLOpenOrderFromCollL2Strategy');

    aaveV3EOAFLBoostOnPriceL2Strategy.addSubSlot('&collAsset', 'address');
    aaveV3EOAFLBoostOnPriceL2Strategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3EOAFLBoostOnPriceL2Strategy.addSubSlot('&debtAsset', 'address');
    aaveV3EOAFLBoostOnPriceL2Strategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3EOAFLBoostOnPriceL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3EOAFLBoostOnPriceL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3EOAFLBoostOnPriceL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3EOAFLBoostOnPriceL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3EOAFLBoostOnPriceL2Strategy.addSubSlot('&onBehalfAddr', 'address');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3EOAFLBoostOnPriceL2Strategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%debtAsset'], // sent by backend
            ['%flAmount'], // sent by backend
            '%nullAddress',
            [],
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&debtAsset',
            '&collAsset',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collAsset',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );
    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '&useDefaultMarket', // hardcode to false
        '&marketAddr',
        '$3', // output of gas fee taker action
        '&proxy',
        '&collAsset',
        '&collAssetId',
        '%enableAsColl', // hardcode to true
        '&useOnBehalf', // hardcode to true
        '&onBehalfAddr', // EOA addr from subData
    );
    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '&useDefaultMarket', // hardcode to false
        '&marketAddr',
        '$1',
        '%flAddress', // fl address, sent by backend
        '%rateMode', // hardcode to VARIABLE = 2
        '&debtAssetId',
        '&useOnBehalf', // hardcode to true
        '&onBehalfAddr', // EOA addr from subData
    );
    const openRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
        '&onBehalfAddr',
    );
    aaveV3EOAFLBoostOnPriceL2Strategy.addAction(flAction);
    aaveV3EOAFLBoostOnPriceL2Strategy.addAction(sellAction);
    aaveV3EOAFLBoostOnPriceL2Strategy.addAction(feeTakingAction);
    aaveV3EOAFLBoostOnPriceL2Strategy.addAction(supplyAction);
    aaveV3EOAFLBoostOnPriceL2Strategy.addAction(borrowAction);
    aaveV3EOAFLBoostOnPriceL2Strategy.addAction(openRatioCheckAction);
    return aaveV3EOAFLBoostOnPriceL2Strategy.encodeForDsProxyCall();
};

const createAaveV3EOARepayOnPriceL2Strategy = () => {
    const aaveV3EOARepayOnPriceL2Strategy = new dfs.Strategy('AaveV3RepayOnPriceL2');

    aaveV3EOARepayOnPriceL2Strategy.addSubSlot('&collAsset', 'address');
    aaveV3EOARepayOnPriceL2Strategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3EOARepayOnPriceL2Strategy.addSubSlot('&debtAsset', 'address');
    aaveV3EOARepayOnPriceL2Strategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3EOARepayOnPriceL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3EOARepayOnPriceL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3EOARepayOnPriceL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3EOARepayOnPriceL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3EOARepayOnPriceL2Strategy.addSubSlot('&onBehalfAddr', 'address');

    const aaveV3Trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3EOARepayOnPriceL2Strategy.addTrigger(aaveV3Trigger);

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '&useDefaultMarket', // hardcoded to false
        '&marketAddr',
        '%amount', // must stay variable
        '&proxy', // hardcoded
        '&collAssetId',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset',
            '$1', //  hardcoded piped from withdraw
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&debtAsset',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '&useDefaultMarket', // hardcoded to false
        '&marketAddr',
        '$3', // amount hardcoded piped from fee taking
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '&debtAsset',
        '&debtAssetId',
        '&useOnBehalf', // hardcoded true
        '&onBehalfAddr', // EOA addr from subData
    );

    const checkerAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
        '&onBehalfAddr',
    );

    aaveV3EOARepayOnPriceL2Strategy.addAction(withdrawAction);
    aaveV3EOARepayOnPriceL2Strategy.addAction(sellAction);
    aaveV3EOARepayOnPriceL2Strategy.addAction(feeTakingAction);
    aaveV3EOARepayOnPriceL2Strategy.addAction(paybackAction);
    aaveV3EOARepayOnPriceL2Strategy.addAction(checkerAction);

    return aaveV3EOARepayOnPriceL2Strategy.encodeForDsProxyCall();
};

const createAaveV3EOAFLRepayOnPriceL2Strategy = () => {
    const aaveV3EOAFLRepayOnPriceL2Strategy = new dfs.Strategy('AaveV3EOAFLRepayOnPriceL2');

    aaveV3EOAFLRepayOnPriceL2Strategy.addSubSlot('&collAsset', 'address');
    aaveV3EOAFLRepayOnPriceL2Strategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3EOAFLRepayOnPriceL2Strategy.addSubSlot('&debtAsset', 'address');
    aaveV3EOAFLRepayOnPriceL2Strategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3EOAFLRepayOnPriceL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3EOAFLRepayOnPriceL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3EOAFLRepayOnPriceL2Strategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3EOAFLRepayOnPriceL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3EOAFLRepayOnPriceL2Strategy.addSubSlot('&onBehalfAddr', 'address');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3EOAFLRepayOnPriceL2Strategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['&collAsset'],
        ['%loanAmount'],
        nullAddress,
        [],
    );

    aaveV3EOAFLRepayOnPriceL2Strategy.addAction(new dfs.actions.flashloan.FLAction(flAction));

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset',
            '0', //  can't hard code because of fee
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&debtAsset',
        '$2', // output of sell action
        '%dfsFeeDivider', // maximum fee that can be taken on contract is 0.05% (dfsFeeDivider = 2000)
        '%l1GasCostInEth', // send custom amount for Optimism
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '&useDefaultMarket', // hardcoded to false
        '&marketAddr',
        '$3', // amount hardcoded output from fee taking
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '&debtAsset',
        '&debtAssetId',
        '&useOnBehalf', // hardcoded true
        '&onBehalfAddr', // EOA addr from subData
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '&useDefaultMarket', // hardcoded to false
        '&marketAddr',
        '$1', // repay fl amount
        '%flAddr', // flAddr not hardcoded (tx will fail if not returned to correct addr)
        '&collAssetId',
    );

    const checkerAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
        '&onBehalfAddr',
    );

    aaveV3EOAFLRepayOnPriceL2Strategy.addAction(sellAction);
    aaveV3EOAFLRepayOnPriceL2Strategy.addAction(feeTakingAction);
    aaveV3EOAFLRepayOnPriceL2Strategy.addAction(paybackAction);
    aaveV3EOAFLRepayOnPriceL2Strategy.addAction(withdrawAction);
    aaveV3EOAFLRepayOnPriceL2Strategy.addAction(checkerAction);

    return aaveV3EOAFLRepayOnPriceL2Strategy.encodeForDsProxyCall();
};

const createAaveV3EOAFLCloseToCollL2Strategy = () => {
    const aaveV3EOAFLCloseToCollL2Strategy = new dfs.Strategy('AaveV3EOAFLCloseToCollL2Strategy');

    aaveV3EOAFLCloseToCollL2Strategy.addSubSlot('&collAsset', 'address');
    aaveV3EOAFLCloseToCollL2Strategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3EOAFLCloseToCollL2Strategy.addSubSlot('&debtAsset', 'address');
    aaveV3EOAFLCloseToCollL2Strategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3EOAFLCloseToCollL2Strategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8'); // only used by backend to determine which action to call
    aaveV3EOAFLCloseToCollL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3EOAFLCloseToCollL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3EOAFLCloseToCollL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3EOAFLCloseToCollL2Strategy.addSubSlot('&onBehalfAddr', 'address');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3EOAFLCloseToCollL2Strategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collAsset'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy', // proxy hardcoded
        '&proxy', // proxy hardcoded
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '&useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$2', // amount hardcoded output from sell action
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '&debtAsset',
        '&debtAssetId',
        '&useOnBehalf', // hardcoded true
        '&onBehalfAddr', // EOA addr hardcoded from subData
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '&useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '%amount', // sent by backend. MaxUint256 for full balance withdraw
        '&proxy', // proxy hardcoded
        '&collAssetId',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeActionL2(
        '%gasStart', // sent by backend
        '&collAsset',
        '$4',
    );

    // return:
    // 1. Send collAsset flashloan amount to flAddress
    // 2. Send all collAsset's left after the close and flRepayment to eoa
    // 3. Send all debtAsset's left after the close and flRepayment to eoa
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        [
            '&collAsset',
            '&collAsset',
            '&debtAsset',
        ],
        [
            '%flAddress', // sent by backend
            '&onBehalfAddr', // EOA addr from subData
            '&onBehalfAddr', // EOA addr from subData
        ],
        [
            '$1',
            '%max(uint)', // sent by backend
            '%max(uint)', // sent by backend
        ],
    );

    aaveV3EOAFLCloseToCollL2Strategy.addAction(flAction);
    aaveV3EOAFLCloseToCollL2Strategy.addAction(sellAction);
    aaveV3EOAFLCloseToCollL2Strategy.addAction(paybackAction);
    aaveV3EOAFLCloseToCollL2Strategy.addAction(withdrawAction);
    aaveV3EOAFLCloseToCollL2Strategy.addAction(feeTakingAction);
    aaveV3EOAFLCloseToCollL2Strategy.addAction(sendTokensAction);

    return aaveV3EOAFLCloseToCollL2Strategy.encodeForDsProxyCall();
};

const createAaveV3EOAFLCloseToDebtL2Strategy = () => {
    const aaveV3EOAFLCloseToDebtL2Strategy = new dfs.Strategy('AaveV3EOAFLCloseToDebtL2Strategy');

    aaveV3EOAFLCloseToDebtL2Strategy.addSubSlot('&collAsset', 'address');
    aaveV3EOAFLCloseToDebtL2Strategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3EOAFLCloseToDebtL2Strategy.addSubSlot('&debtAsset', 'address');
    aaveV3EOAFLCloseToDebtL2Strategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3EOAFLCloseToDebtL2Strategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8'); // only used by backend to determine which action to call
    aaveV3EOAFLCloseToDebtL2Strategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3EOAFLCloseToDebtL2Strategy.addSubSlot('&marketAddr', 'address');
    aaveV3EOAFLCloseToDebtL2Strategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3EOAFLCloseToDebtL2Strategy.addSubSlot('&onBehalfAddr', 'address');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3EOAFLCloseToDebtL2Strategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%debtAsset'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '&useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$2', // amount hardcoded output from flAction
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '&debtAsset',
        '&debtAssetId',
        '&useOnBehalf', // hardcoded true
        '&onBehalfAddr', // EOA addr hardcoded from subData
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '&useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '%amount', // sent by backend
        '&proxy', // proxy hardcoded
        '&collAssetId',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset',
            '$3', // output of withdrawAction
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy', // proxy hardcoded
        '&proxy', // proxy hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&debtAsset',
        '$4',
    );

    // return:
    // 1. Send debtToken's flashloan amount to flAddress
    // 2. Send all debtToken's left after the close to EOA
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        [
            '&debtAsset',
            '&debtAsset',
        ],
        [
            '%flAddress', // sent by backend
            '&onBehalfAddr', // EOA addr from subData
        ],
        [
            '$1',
            '%max(uint)', // sent by backend
        ],
    );

    aaveV3EOAFLCloseToDebtL2Strategy.addAction(flAction);
    aaveV3EOAFLCloseToDebtL2Strategy.addAction(paybackAction);
    aaveV3EOAFLCloseToDebtL2Strategy.addAction(withdrawAction);
    aaveV3EOAFLCloseToDebtL2Strategy.addAction(sellAction);
    aaveV3EOAFLCloseToDebtL2Strategy.addAction(feeTakingAction);
    aaveV3EOAFLCloseToDebtL2Strategy.addAction(sendTokensAction);

    return aaveV3EOAFLCloseToDebtL2Strategy.encodeForDsProxyCall();
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
    aaveV3CloseActions,
    createDCAL2Strategy,
    createLimitOrderL2Strategy,
    createCompV3RepayL2Strategy,
    createCompV3FLRepayL2Strategy,
    createCompV3BoostL2Strategy,
    createCompV3FLBoostL2Strategy,
    createAaveV3OpenOrderFromCollL2Strategy,
    createAaveV3FLOpenOrderFromCollL2Strategy,
    createAaveV3FLOpenOrderFromDebtL2Strategy,
    createMorphoBlueBoostL2Strategy,
    createMorphoBlueFLDebtBoostL2Strategy,
    createMorphoBlueFLCollBoostL2Strategy,
    createMorphoBlueRepayL2Strategy,
    createMorphoBlueFLCollRepayL2Strategy,
    createMorphoBlueFLDebtRepayL2Strategy,
    createMorphoBlueBoostOnTargetPriceL2Strategy,
    createMorphoBlueFLBoostOnTargetPriceL2Strategy,
    createAaveV3RepayOnPriceL2Strategy,
    createAaveV3FlRepayOnPriceL2Strategy,
    createFluidT1RepayL2Strategy,
    createFluidT1FLRepayL2Strategy,
    createFluidT1BoostL2Strategy,
    createFluidT1FLBoostL2Strategy,
    createCompV3BoostOnPriceL2Strategy,
    createCompV3FLBoostOnPriceL2Strategy,
    createCompV3RepayOnPriceL2Strategy,
    createCompV3FLRepayOnPriceL2Strategy,
    createCompV3FLCloseToDebtL2Strategy,
    createCompV3FLCloseToCollL2Strategy,
    createCompV3EOARepayL2Strategy,
    createCompV3EOAFlRepayL2Strategy,
    createCompV3EOABoostL2Strategy,
    createCompV3EOAFlBoostL2Strategy,
    createAaveV3EOABoostL2Strategy,
    createAaveV3EOAFLBoostL2Strategy,
    createAaveV3EOARepayL2Strategy,
    createAaveV3EOAFLRepayL2Strategy,
    createAaveV3EOABoostOnPriceL2Strategy,
    createAaveV3EOAFLBoostOnPriceL2Strategy,
    createAaveV3EOARepayOnPriceL2Strategy,
    createAaveV3EOAFLRepayOnPriceL2Strategy,
    createAaveV3EOAFLCloseToCollL2Strategy,
    createAaveV3EOAFLCloseToDebtL2Strategy,
};
