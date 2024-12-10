const dfs = require('@defisaver/sdk');

const {
    formatExchangeObj,
    nullAddress,
    placeHolderAddr,
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
};
