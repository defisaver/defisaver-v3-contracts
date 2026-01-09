const dfs = require('@defisaver/sdk');

const { formatExchangeObj, nullAddress, placeHolderAddr } = require('../test/utils/utils');

const createRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('McdRepayStrategy');

    repayStrategy.addSubSlot('&vaultId', 'uint256');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&daiAddr', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const ratioAction = new dfs.actions.maker.MakerRatioAction('&vaultId');

    const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        '&vaultId',
        '%withdrawAmount',
        '%ethJoin',
        '&proxy',
        '%mcdManager',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '%wethAddr', '$2');

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%wethAddr', '&daiAddr', '$3', '%exchangeWrapper'),
        '&proxy',
        '&proxy',
    );

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        '&vaultId',
        '$4',
        '&proxy',
        '%mcdManager',
    );

    const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
        '%ratioState',
        '%checkTarget',
        '&targetRatio', // targetRatio
        '&vaultId', // vaultId
        '%ratioActionPositionInRecipe',
    );

    repayStrategy.addAction(ratioAction);
    repayStrategy.addAction(withdrawAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(sellAction);
    repayStrategy.addAction(mcdPaybackAction);
    repayStrategy.addAction(mcdRatioCheckAction);

    return repayStrategy.encodeForDsProxyCall();
};

const createFLRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('MakerFLRepayStrategy');

    repayStrategy.addSubSlot('&vaultId', 'uint256');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&daiAddr', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(['%wethAddr'], ['%amount']);

    const ratioAction = new dfs.actions.maker.MakerRatioAction('&vaultId');

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%wethAddr', '&daiAddr', '$1', '%exchangeWrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '&daiAddr', '$3');

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        '&vaultId',
        '$4',
        '&proxy',
        '%mcdManager',
    );

    const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        '&vaultId',
        '$1',
        '%ethJoin',
        '%flAddr',
        '%mcdManager',
    );

    const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
        '%ratioState',
        '%checkTarget',
        '&targetRatio', // targetRatio
        '&vaultId', // vaultId
        '%ratioActionPositionInRecipe',
    );

    repayStrategy.addAction(flAction);
    repayStrategy.addAction(ratioAction);
    repayStrategy.addAction(sellAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(mcdPaybackAction);
    repayStrategy.addAction(withdrawAction);
    repayStrategy.addAction(mcdRatioCheckAction);

    return repayStrategy.encodeForDsProxyCall();
};

const createMcdRepayCompositeStrategy = () => {
    const repayStrategy = new dfs.Strategy('MakerRepayCompositeStrategy');

    repayStrategy.addSubSlot('&vaultId', 'uint256');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&daiAddr', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const repayCompositeAction = new dfs.actions.maker.MakerRepayCompositeAction(
        '&vaultId',
        '%joinAddr',
        '%gasUsed',
        '%flAddr',
        '%flAmount',
        '%nextPrice',
        '%targetRatio',
        formatExchangeObj('%wethAddr', '&daiAddr', '%repayAmount', '%exchangeWrapper'),
    );

    repayStrategy.addAction(repayCompositeAction);

    return repayStrategy.encodeForDsProxyCall();
};

const createMcdFLRepayCompositeStrategy = () => {
    const repayStrategy = new dfs.Strategy('MakerFLRepayCompositeStrategy');

    repayStrategy.addSubSlot('&vaultId', 'uint256');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&daiAddr', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%collAddr'],
        ['%loanAmount'],
        nullAddress,
        [],
    );

    repayStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));

    const repayCompositeAction = new dfs.actions.maker.MakerRepayCompositeAction(
        '&vaultId',
        '%joinAddr',
        '%gasUsed',
        '%flAddr',
        '$1',
        '%nextPrice',
        '%targetRatio',
        formatExchangeObj('%wethAddr', '&daiAddr', '%repayAmount', '%exchangeWrapper'),
    );

    repayStrategy.addAction(repayCompositeAction);

    return repayStrategy.encodeForDsProxyCall();
};

const createMcdCloseToDaiStrategy = (isTrailing = false) => {
    const strategyName = isTrailing ? 'McdTrailingCloseToDaiStrategy' : 'McdCloseToDaiStrategy';

    const mcdCloseStrategy = new dfs.Strategy(strategyName);
    mcdCloseStrategy.addSubSlot('&vaultId', 'uint256');
    mcdCloseStrategy.addSubSlot('&daiAddr', 'address');
    mcdCloseStrategy.addSubSlot('&mcdManager', 'address');

    let trigger = new dfs.triggers.ChainLinkPriceTrigger(nullAddress, '0', '0');

    if (isTrailing) {
        // tokenAddr, percentage, startRoundId
        trigger = new dfs.triggers.TrailingStopTrigger(nullAddress, '0', '0');
    }

    mcdCloseStrategy.addTrigger(trigger);
    mcdCloseStrategy.addAction(
        new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.MakerFlashLoanAction(
                '%loanAmount', // cdp.debt + a bit extra to handle debt increasing
                nullAddress,
                [],
            ),
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.maker.MakerPaybackAction(
            '&vaultId', // hardcoded vault from subData
            '%daiAmountToPayback(maxUint)', // kept variable (can support partial close later)
            '&proxy', // hardcoded so it's taken from proxy
            '&mcdManager', // hardcoded so no outside manager addr can be injected
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.maker.MakerWithdrawAction(
            '&vaultId', // hardcoded vault from subData
            '%ethAmountToWithdraw(maxUint)', // kept variable (can support partial close later)
            '%ethJoin', // must stay variable as cdp can have diff. join addr
            '&proxy', // hardcoded so funds are sent to users proxy
            '&mcdManager', // hardcoded so no outside manager addr can be injected
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.basic.SellAction(
            formatExchangeObj(
                '%wethAddr', // must be left variable diff. coll from cdps
                '&daiAddr', // hardcoded always will be buying dai
                '%amountToSell(maxUint)', // amount to sell is variable
                '%exchangeWrapper', // exchange wrapper can change
            ),
            '&proxy', // hardcoded take from user proxy
            '&proxy', // hardcoded send to user proxy
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.basic.GasFeeAction('%repayGasCost', '&daiAddr', '$4', 0),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.basic.SendTokenAction(
            '&daiAddr', // hardcoded only can borrow Dai
            '%makerFlAddr', // kept variable this can change (FL must be paid back to work)
            '$1', // hardcoded output from FL action
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.basic.SendTokenAction(
            '&daiAddr', // hardcoded Dai is left in proxy
            '&eoa', // hardcoded so only proxy owner receives amount
            '%amountToRecipient(maxUint)', // kept variable (can support partial close later)
        ),
    );
    return mcdCloseStrategy.encodeForDsProxyCall();
};

const createMcdCloseToCollStrategy = (isTrailing = false) => {
    const strategyName = isTrailing ? 'McdTrailingCloseToCollStrategy' : 'McdCloseToCollStrategy';

    const mcdCloseStrategy = new dfs.Strategy(strategyName);
    mcdCloseStrategy.addSubSlot('&vaultId', 'uint256');
    mcdCloseStrategy.addSubSlot('&collAddr', 'address');
    mcdCloseStrategy.addSubSlot('&daiAddr', 'address');
    mcdCloseStrategy.addSubSlot('&mcdManager', 'address');

    let trigger = new dfs.triggers.ChainLinkPriceTrigger(nullAddress, '0', '0');

    if (isTrailing) {
        // tokenAddr, percentage, startRoundId
        trigger = new dfs.triggers.TrailingStopTrigger(nullAddress, '0', '0');
    }

    mcdCloseStrategy.addTrigger(trigger);
    mcdCloseStrategy.addAction(
        new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.MakerFlashLoanAction(
                '%loanAmount', // cdp.debt + a bit extra to handle debt increasing
                nullAddress,
                [],
            ),
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.maker.MakerPaybackAction(
            '&vaultId', // hardcoded vault from subData
            '%daiAmountToPayback(maxUint)', // kept variable (can support partial close later)
            '&proxy', // hardcoded so it's taken from proxy
            '&mcdManager', // hardcoded so no outside manager addr can be injected
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.maker.MakerWithdrawAction(
            '&vaultId', // hardcoded vault from subData
            '%ethAmountToWithdraw(maxUint)', // kept variable (can support partial close later)
            '%ethJoin', // must stay variable as cdp can have diff. join addr
            '&proxy', // hardcoded so funds are sent to users proxy
            '&mcdManager', // hardcoded so no outside manager addr can be injected
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.basic.SellAction(
            formatExchangeObj(
                '%wethAddr', // must be left variable diff. coll from cdps
                '&daiAddr', // hardcoded always will be buying dai
                '%amountToSell', // amount to sell is variable
                '%exchangeWrapper', // exchange wrapper can change
            ),
            '&proxy', // hardcoded take from user proxy
            '&proxy', // hardcoded send to user proxy
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.basic.GasFeeAction(
            '%repayGasCost', // variable backend calculated exact cost in simulation
            '&collAddr', // hardcoded fee always in coll addr
            0, // if not being piped into take proxy balance
            0, //  dfs fee divider, default is 2000 if sent 0
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.basic.SendTokenAction(
            '&daiAddr', // hardcoded only can borrow Dai
            '%makerFlAddr', // kept variable this can change (FL must be paid back to work)
            '$1', // hardcoded output from FL action
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.basic.SendTokenAction(
            '&daiAddr', // hardcoded Dai is left in proxy
            '&eoa', // hardcoded so only proxy owner receives amount
            '%amountToRecipient(maxUint)', // kept variable (can support partial close later)
        ),
    );
    mcdCloseStrategy.addAction(
        new dfs.actions.basic.SendTokenAndUnwrapAction(
            '&collAddr', // hardcoded coll is left in proxy
            '&eoa', // hardcoded so only proxy owner receives amount
            '%amountToRecipient(maxUint)', // kept variable (can support partial close later)
        ),
    );

    return mcdCloseStrategy.encodeForDsProxyCall();
};

const createLiquityRepayStrategy = () => {
    const liquityRepayStrategy = new dfs.Strategy('LiquityRepayStrategy');
    liquityRepayStrategy.addSubSlot('&ratioState', 'uint8');
    liquityRepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    liquityRepayStrategy.addTrigger(liquityRatioTrigger);

    const liquityWithdrawAction = new dfs.actions.liquity.LiquityWithdrawAction(
        '%repayAmount',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%wethAddr', '%lusdAddr', '$1', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%repayGasCost', '%lusdAddr', '$2');

    const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '$3',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
        '&ratioState',
        '&targetRatio',
    );

    liquityRepayStrategy.addAction(liquityWithdrawAction);
    liquityRepayStrategy.addAction(sellAction);
    liquityRepayStrategy.addAction(feeTakingAction);
    liquityRepayStrategy.addAction(liquityPaybackAction);
    liquityRepayStrategy.addAction(liquityRatioCheckAction);

    return liquityRepayStrategy.encodeForDsProxyCall();
};

const createLiquityDebtInFrontRepayStrategy = () => {
    const liquityFLRepayStrategy = new dfs.Strategy('LiquityDebtInFrontRepayStrategy');
    liquityFLRepayStrategy.addSubSlot('&wethAddr', 'address');
    liquityFLRepayStrategy.addSubSlot('&lusdAddr', 'address');
    liquityFLRepayStrategy.addSubSlot('&ratioIncrease', 'uin256');
    liquityFLRepayStrategy.addSubSlot('&collChangeId.WITHDRAW', 'uint8');
    liquityFLRepayStrategy.addSubSlot('&debtChangeId.PAYBACK', 'uint8');

    const liquityRatioTrigger = new dfs.triggers.LiquityDebtInFrontWithLimitTrigger('0');
    liquityFLRepayStrategy.addTrigger(liquityRatioTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(['%wethAddr'], ['%flAmount']),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('&wethAddr', '&lusdAddr', '%exchangeAmount', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%repayGasCost', '&lusdAddr', '$2');

    const liquityAdjustAction = new dfs.actions.liquity.LiquityAdjustAction(
        '%0', // no liquity fee charged in recipe
        '$1',
        '$3',
        '&collChangeId.WITHDRAW',
        '&debtChangeId.PAYBACK',
        '&proxy',
        '%FLAddr',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioIncreaseCheckAction =
        new dfs.actions.checkers.LiquityRatioIncreaseCheckAction('&ratioIncrease');

    liquityFLRepayStrategy.addAction(flAction);
    liquityFLRepayStrategy.addAction(sellAction);
    liquityFLRepayStrategy.addAction(feeTakingAction);
    liquityFLRepayStrategy.addAction(liquityAdjustAction);
    liquityFLRepayStrategy.addAction(liquityRatioIncreaseCheckAction);

    return liquityFLRepayStrategy.encodeForDsProxyCall();
};

const createLiquityFLRepayStrategy = () => {
    const liquityFLRepayStrategy = new dfs.Strategy('LiquityFLRepayStrategy');
    liquityFLRepayStrategy.addSubSlot('&ratioState', 'uint8');
    liquityFLRepayStrategy.addSubSlot('&targetRatio', 'uint256');
    liquityFLRepayStrategy.addSubSlot('&collChangeId.WITHDRAW', 'uint8');
    liquityFLRepayStrategy.addSubSlot('&debtChangeId.PAYBACK', 'uint8');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    liquityFLRepayStrategy.addTrigger(liquityRatioTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(['%wethAddr'], ['%flAmount']),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%wethAddr', '%lusdAddr', '%exchangeAmount', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%repayGasCost', '%lusdAddr', '$2');

    const liquityAdjustAction = new dfs.actions.liquity.LiquityAdjustAction(
        '%0', // no liquity fee charged in recipe
        '$1',
        '$3',
        '&collChangeId.WITHDRAW',
        '&debtChangeId.PAYBACK',
        '&proxy',
        '%FLAddr',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
        '&ratioState',
        '&targetRatio',
    );

    liquityFLRepayStrategy.addAction(flAction);
    liquityFLRepayStrategy.addAction(sellAction);
    liquityFLRepayStrategy.addAction(feeTakingAction);
    liquityFLRepayStrategy.addAction(liquityAdjustAction);
    liquityFLRepayStrategy.addAction(liquityRatioCheckAction);

    return liquityFLRepayStrategy.encodeForDsProxyCall();
};

const createLiquityBoostStrategy = () => {
    const liquityBoostStrategy = new dfs.Strategy('LiquityBoostStrategy');
    liquityBoostStrategy.addSubSlot('&ratioState', 'uint8');
    liquityBoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    liquityBoostStrategy.addTrigger(liquityRatioTrigger);

    const liquityBorrowAction = new dfs.actions.liquity.LiquityBorrowAction(
        '%maxFeePercentage',
        '%boostAmount',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%lusdAddr', '%wethAddr', '$1', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%boostGasCost', '%wethAddr', '$2');

    const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
        '$3',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
        '&ratioState',
        '&targetRatio',
    );

    liquityBoostStrategy.addAction(liquityBorrowAction);
    liquityBoostStrategy.addAction(sellAction);
    liquityBoostStrategy.addAction(feeTakingAction);
    liquityBoostStrategy.addAction(liquitySupplyAction);
    liquityBoostStrategy.addAction(liquityRatioCheckAction);

    return liquityBoostStrategy.encodeForDsProxyCall();
};

const createLiquityFLBoostStrategy = () => {
    const liquityFLBoostStrategy = new dfs.Strategy('LiquityFLBoostStrategy');
    liquityFLBoostStrategy.addSubSlot('&ratioState', 'uint8');
    liquityFLBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    liquityFLBoostStrategy.addSubSlot('&collChangeId.SUPPLY', 'uint8');
    liquityFLBoostStrategy.addSubSlot('&debtChangeId.BORROW', 'uint8');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    liquityFLBoostStrategy.addTrigger(liquityRatioTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(['%lusdAddr'], ['%flAmount']),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%lusdAddr', '%wethAddr', '%exchangeAmount', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%boostGasCost', '%wethAddr', '$2');

    const liquityAdjustAction = new dfs.actions.liquity.LiquityAdjustAction(
        '%maxFeePercentage',
        '$3',
        '$1',
        '&collChangeId.SUPPLY',
        '&debtChangeId.BORROW',
        '&proxy',
        '%FLAddr',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
        '&ratioState',
        '&targetRatio',
    );

    liquityFLBoostStrategy.addAction(flAction);
    liquityFLBoostStrategy.addAction(sellAction);
    liquityFLBoostStrategy.addAction(feeTakingAction);
    liquityFLBoostStrategy.addAction(liquityAdjustAction);
    liquityFLBoostStrategy.addAction(liquityRatioCheckAction);

    return liquityFLBoostStrategy.encodeForDsProxyCall();
};

const createLiquityFLBoostWithCollStrategy = () => {
    const LiquityFLBoostWithCollStrategy = new dfs.Strategy('LiquityFLBoostWithCollStrategy');
    LiquityFLBoostWithCollStrategy.addSubSlot('&ratioState', 'uint8');
    LiquityFLBoostWithCollStrategy.addSubSlot('&targetRatio', 'uint256');
    LiquityFLBoostWithCollStrategy.addSubSlot('&collChangeId.SUPPLY', 'uint8');
    LiquityFLBoostWithCollStrategy.addSubSlot('&debtChangeId.BORROW', 'uint8');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    LiquityFLBoostWithCollStrategy.addTrigger(liquityRatioTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(['%wethAddr'], ['%flAmount']),
    );

    const liquityAdjustAction = new dfs.actions.liquity.LiquityAdjustAction(
        '%maxFeePercentage',
        '%flAmountWeGotBack',
        '%boostAmount',
        '&collChangeId.SUPPLY',
        '&debtChangeId.BORROW',
        '&proxy',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%lusdAddr', '%wethAddr', '$2', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%boostGasCost', '%wethAddr', '$3');

    const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
        '$4',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const liquityWithdrawAction = new dfs.actions.liquity.LiquityWithdrawAction(
        '$1',
        '%FLAddr',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
        '&ratioState',
        '&targetRatio',
    );

    LiquityFLBoostWithCollStrategy.addAction(flAction);
    LiquityFLBoostWithCollStrategy.addAction(liquityAdjustAction);
    LiquityFLBoostWithCollStrategy.addAction(sellAction);
    LiquityFLBoostWithCollStrategy.addAction(feeTakingAction);
    LiquityFLBoostWithCollStrategy.addAction(liquitySupplyAction);
    LiquityFLBoostWithCollStrategy.addAction(liquityWithdrawAction);
    LiquityFLBoostWithCollStrategy.addAction(liquityRatioCheckAction);

    return LiquityFLBoostWithCollStrategy.encodeForDsProxyCall();
};

const createLiquityCloseToCollStrategy = (isTrailing = false) => {
    const strategyName = isTrailing
        ? 'LiquityTrailingCloseToCollStrategy'
        : 'LiquityCloseToCollStrategy';

    const liquityCloseToCollStrategy = new dfs.Strategy(strategyName);
    liquityCloseToCollStrategy.addSubSlot('&weth', 'address');
    liquityCloseToCollStrategy.addSubSlot('&lusd', 'address');

    let trigger = new dfs.triggers.ChainLinkPriceTrigger(nullAddress, '0', '0');

    if (isTrailing) {
        // tokenAddr, percentage, startRoundId
        trigger = new dfs.triggers.TrailingStopTrigger(nullAddress, '0', '0');
    }

    liquityCloseToCollStrategy.addTrigger(trigger);
    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        '%loanAmount', // (trove.debt - 200 LUSD) in weth + a bit over to handle slippage
        '&weth', // hardcoded only weth is used (currently must be set by backend)
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&weth',
            '&lusd',
            '%amount', // kept variable as flAction might be amount + fee
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const liquityCloseAction = new dfs.actions.liquity.LiquityCloseAction(
        '&proxy', // hardcoded take lusd from proxy
        '&proxy', // hardcoded send to proxy
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '&weth', '$3');

    const sendFL = new dfs.actions.basic.SendTokenAction(
        '&weth', // hardcoded only can send weth
        '%balancerFlAddr', // kept variable this can change (FL must be paid back to work)
        '$1', // hardcoded output from FL action
    );

    const sendWethToEoa = new dfs.actions.basic.SendTokenAndUnwrapAction(
        '&weth', // hardcoded only can send weth
        '&eoa', // hardcoded send to eoa
        '%max(uint)', // variable amount (proxy.balance)
    );

    const sendLUSDToEoa = new dfs.actions.basic.SendTokenAction(
        '&lusd', // hardcoded only can send Lusd
        '&eoa', // hardcoded send to eoa
        '%max(uint)', // variable amount (proxy.balance)
    );

    liquityCloseToCollStrategy.addAction(flAction);
    liquityCloseToCollStrategy.addAction(sellAction);
    liquityCloseToCollStrategy.addAction(liquityCloseAction);
    liquityCloseToCollStrategy.addAction(feeTakingAction);
    liquityCloseToCollStrategy.addAction(sendFL);
    liquityCloseToCollStrategy.addAction(sendWethToEoa);
    liquityCloseToCollStrategy.addAction(sendLUSDToEoa);

    return liquityCloseToCollStrategy.encodeForDsProxyCall();
};

const createLimitOrderStrategy = () => {
    const limitOrderStrategy = new dfs.Strategy('LimitOrderStrategy');

    const offchainPriceTrigger = new dfs.triggers.OffchainPriceTrigger('0', '0');
    limitOrderStrategy.addTrigger(offchainPriceTrigger);

    limitOrderStrategy.addSubSlot('&tokenAddrSell', 'address');
    limitOrderStrategy.addSubSlot('&tokenAddrBuy', 'address');
    limitOrderStrategy.addSubSlot('&amount', 'uint256');

    const sellAction = new dfs.actions.basic.LimitSellAction(
        formatExchangeObj('&tokenAddrSell', '&tokenAddrBuy', '&amount', '%exchangeWrapper'),
        '&eoa',
        '&eoa',
        '%gasUsed',
    );

    limitOrderStrategy.addAction(sellAction);

    return limitOrderStrategy.encodeForDsProxyCall();
};

const createDCAStrategy = () => {
    const dcaStrategy = new dfs.Strategy('DCAStrategy');

    dcaStrategy.addSubSlot('&sellToken', 'address');
    dcaStrategy.addSubSlot('&buyToken', 'address');
    dcaStrategy.addSubSlot('&amount', 'uint256');
    dcaStrategy.addSubSlot('&interval', 'uint256');

    const timestampTrigger = new dfs.triggers.TimestampTrigger('0');
    dcaStrategy.addTrigger(timestampTrigger);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('&sellToken', '&buyToken', '&amount', '%exchangeWrapper'),
        '&eoa',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '&buyToken', '$1');

    const sendTokenAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
        '&buyToken',
        '&eoa',
        '$2',
    );

    dcaStrategy.addAction(sellAction);
    dcaStrategy.addAction(feeTakingAction);
    dcaStrategy.addAction(sendTokenAction);

    return dcaStrategy.encodeForDsProxyCall();
};

const createMcdBoostStrategy = () => {
    const mcdBoostStrategy = new dfs.Strategy('MakerBoostStrategy');
    mcdBoostStrategy.addSubSlot('&vaultId', 'uint256');
    mcdBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    mcdBoostStrategy.addSubSlot('&daiAddr', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    mcdBoostStrategy.addTrigger(mcdRatioTrigger);

    const ratioAction = new dfs.actions.maker.MakerRatioAction('&vaultId');

    const generateAction = new dfs.actions.maker.MakerGenerateAction(
        '&vaultId',
        '%generateAmount',
        '&proxy',
        '%managerAddr',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('&daiAddr', '%wethAddr', '$2', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '%wethAddr', '$3');

    const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
        '&vaultId', // vaultId
        '$4', // amount
        '%ethJoin',
        '&proxy', // proxy
        '%mcdManager',
    );

    const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
        '%ratioState',
        '%checkTarget',
        '&targetRatio', // targetRatio
        '&vaultId', // vaultId
        '%ratioActionPositionInRecipe',
    );

    mcdBoostStrategy.addAction(ratioAction);
    mcdBoostStrategy.addAction(generateAction);
    mcdBoostStrategy.addAction(sellAction);
    mcdBoostStrategy.addAction(feeTakingAction);
    mcdBoostStrategy.addAction(mcdSupplyAction);
    mcdBoostStrategy.addAction(mcdRatioCheckAction);

    return mcdBoostStrategy.encodeForDsProxyCall();
};

const createFlMcdBoostStrategy = () => {
    const mcdBoostStrategy = new dfs.Strategy('MakerFLBoostStrategy');
    mcdBoostStrategy.addSubSlot('&vaultId', 'uint256');
    mcdBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    mcdBoostStrategy.addSubSlot('&daiAddr', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    mcdBoostStrategy.addTrigger(mcdRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(['%daiAddr'], ['%amount']);

    const ratioAction = new dfs.actions.maker.MakerRatioAction('&vaultId');

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('&daiAddr', '%wethAddr', '$1', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '%wethAddr', '$3');

    const mcdSupplyAction = new dfs.actions.maker.MakerSupplyAction(
        '&vaultId', // vaultId
        '$4', // amount
        '%ethJoin',
        '&proxy', // proxy
        '%mcdManager',
    );

    const generateAction = new dfs.actions.maker.MakerGenerateAction(
        '&vaultId',
        '$1',
        '%FLAddr',
        '%managerAddr',
    );

    const mcdRatioCheckAction = new dfs.actions.checkers.MakerRatioCheckAction(
        '%ratioState',
        '%checkTarget',
        '&targetRatio', // targetRatio
        '&vaultId', // vaultId
        '%ratioActionPositionInRecipe',
    );

    mcdBoostStrategy.addAction(flAction);
    mcdBoostStrategy.addAction(ratioAction);
    mcdBoostStrategy.addAction(sellAction);
    mcdBoostStrategy.addAction(feeTakingAction);
    mcdBoostStrategy.addAction(mcdSupplyAction);
    mcdBoostStrategy.addAction(generateAction);
    mcdBoostStrategy.addAction(mcdRatioCheckAction);

    return mcdBoostStrategy.encodeForDsProxyCall();
};

const createMcdBoostCompositeStrategy = () => {
    const mcdBoostStrategy = new dfs.Strategy('MakerBoostCompositeStrategy');
    mcdBoostStrategy.addSubSlot('&vaultId', 'uint256');
    mcdBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    mcdBoostStrategy.addSubSlot('&daiAddr', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    mcdBoostStrategy.addTrigger(mcdRatioTrigger);

    const boostCompositeAction = new dfs.actions.maker.MakerBoostCompositeAction(
        '&vaultId',
        '%joinAddr',
        '%gasUsed',
        '%flAddr',
        '%0',
        '%nextPrice',
        '%targetRatio',
        formatExchangeObj('&daiAddr', '%wethAddr', '%boostAmount', '%wrapper'),
    );

    mcdBoostStrategy.addAction(boostCompositeAction);

    return mcdBoostStrategy.encodeForDsProxyCall();
};

const createMcdFLBoostCompositeStrategy = () => {
    const mcdBoostStrategy = new dfs.Strategy('MakerFLBoostCompositeStrategy');
    mcdBoostStrategy.addSubSlot('&vaultId', 'uint256');
    mcdBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    mcdBoostStrategy.addSubSlot('&daiAddr', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    mcdBoostStrategy.addTrigger(mcdRatioTrigger);

    const flAction = new dfs.actions.flashloan.MakerFlashLoanAction('%loanAmount', nullAddress, []);

    mcdBoostStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));

    const boostCompositeAction = new dfs.actions.maker.MakerBoostCompositeAction(
        '&vaultId',
        '%joinAddr',
        '%gasUsed',
        '%flAddr',
        '$1',
        '%nextPrice',
        '%targetRatio',
        formatExchangeObj('&daiAddr', '%wethAddr', '%boostAmount', '%wrapper'),
    );

    mcdBoostStrategy.addAction(boostCompositeAction);

    return mcdBoostStrategy.encodeForDsProxyCall();
};

const createCompV3RepayStrategy = () => {
    const compV3RepayStrategy = new dfs.Strategy('CompV3RepayStrategy');

    compV3RepayStrategy.addSubSlot('&market', 'address');
    compV3RepayStrategy.addSubSlot('&baseToken', 'address');
    compV3RepayStrategy.addSubSlot('&ratioState', 'uint256');
    compV3RepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const compV3Trigger = new dfs.triggers.CompV3RatioTrigger('0', '0', '0');
    compV3RepayStrategy.addTrigger(compV3Trigger);

    const withdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        '&market', // comet proxy addr of used market
        '&proxy', // hardcoded
        '%assetAddr', // variable token to withdraw
        '%amount', // variable amount to withdraw
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '&baseToken', // baseToken hardcoded
            '$1', //  hardcoded piped from fee taking
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '&baseToken', '$2');

    const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market', // hardcoded
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
        '&proxy', // proxy hardcoded (onBehalf)
        placeHolderAddr, // additional only needed for sdk for front
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
    );

    compV3RepayStrategy.addAction(withdrawAction);
    compV3RepayStrategy.addAction(sellAction);
    compV3RepayStrategy.addAction(feeTakingAction);
    compV3RepayStrategy.addAction(paybackAction);
    compV3RepayStrategy.addAction(checkerAction);

    return compV3RepayStrategy.encodeForDsProxyCall();
};

const createCompV3EOARepayStrategy = () => {
    const compV3RepayStrategy = new dfs.Strategy('CompV3EOARepayStrategy');

    compV3RepayStrategy.addSubSlot('&market', 'address');
    compV3RepayStrategy.addSubSlot('&baseToken', 'address');
    compV3RepayStrategy.addSubSlot('&ratioState', 'uint256');
    compV3RepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const compV3Trigger = new dfs.triggers.CompV3RatioTrigger('0', '0', '0');
    compV3RepayStrategy.addTrigger(compV3Trigger);

    const withdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        '&market', // comet proxy addr of used market
        '&proxy', // hardcoded
        '%assetAddr', // variable token to withdraw
        '%amount', // variable amount to withdraw
        '&eoa', // hardcoded eoa onBehalf param
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '&baseToken', // baseToken hardcoded
            '$1', //  hardcoded piped from fee taking
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '&baseToken', '$2');

    const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market', // hardcoded
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
        '&eoa', // proxy hardcoded (onBehalf)
        placeHolderAddr, // additional only needed for sdk for front
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

const createFlCompV3RepayStrategy = () => {
    const compV3RepayStrategy = new dfs.Strategy('CompV3FlRepayStrategy');

    compV3RepayStrategy.addSubSlot('&market', 'address');
    compV3RepayStrategy.addSubSlot('&baseToken', 'address');
    compV3RepayStrategy.addSubSlot('&ratioState', 'uint256');
    compV3RepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const compV3Trigger = new dfs.triggers.CompV3RatioTrigger('0', '0', '0');
    compV3RepayStrategy.addTrigger(compV3Trigger);

    const flBalancer = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%collAddr'],
        ['%repayAmount'],
    );
    const flAction = new dfs.actions.flashloan.FLAction(flBalancer);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '&baseToken', // must stay variable
            '%amount', // variable amount to sell
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '&baseToken', '$2');

    const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market', // hardcoded
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
        '&proxy', // proxy hardcoded (onBehalf)
        placeHolderAddr, // additional only needed for sdk for front
    );

    const withdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        '&market', // comet proxy addr of used market
        '%flAddr', // hardcoded
        '%assetAddr', // variable token to withdraw
        '$1', // Fl amount
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
    );

    compV3RepayStrategy.addAction(flAction);
    compV3RepayStrategy.addAction(sellAction);
    compV3RepayStrategy.addAction(feeTakingAction);
    compV3RepayStrategy.addAction(paybackAction);
    compV3RepayStrategy.addAction(withdrawAction);
    compV3RepayStrategy.addAction(checkerAction);

    return compV3RepayStrategy.encodeForDsProxyCall();
};

const createFlCompV3EOARepayStrategy = () => {
    const compV3RepayStrategy = new dfs.Strategy('CompV3FlEOARepayStrategy');

    compV3RepayStrategy.addSubSlot('&market', 'address');
    compV3RepayStrategy.addSubSlot('&baseToken', 'address');
    compV3RepayStrategy.addSubSlot('&ratioState', 'uint256');
    compV3RepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const compV3Trigger = new dfs.triggers.CompV3RatioTrigger('0', '0', '0');
    compV3RepayStrategy.addTrigger(compV3Trigger);

    const flBalancer = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%collAddr'],
        ['%repayAmount'],
    );
    const flAction = new dfs.actions.flashloan.FLAction(flBalancer);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '&baseToken', // must stay variable
            '%amount', // variable amount to sell
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '&baseToken', '$2');

    const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market', // hardcoded
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
        '&eoa', // user acc. hardcoded (onBehalf)
        placeHolderAddr, // additional only needed for sdk for front
    );

    const withdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
        '&market', // comet proxy addr of used market
        '%flAddr', // hardcoded
        '%assetAddr', // variable token to withdraw
        '$1', // Fl amount
        '&eoa', // hardcoded user acc. onBehalf
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

const createCompV3BoostStrategy = () => {
    const compV3BoostStrategy = new dfs.Strategy('CompV3BoostStrategy');

    compV3BoostStrategy.addSubSlot('&market', 'address');
    compV3BoostStrategy.addSubSlot('&baseToken', 'address');
    compV3BoostStrategy.addSubSlot('&ratioState', 'uint256');
    compV3BoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const compV3Trigger = new dfs.triggers.CompV3RatioTrigger('0', '0', '0');
    compV3BoostStrategy.addTrigger(compV3Trigger);

    const borrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
        '&market', // comet proxy addr of used market
        '%amount', // variable amount to borrow
        '&proxy', // hardcoded
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&baseToken', // hardcoded base value
            '%collToken', // must stay variable
            '$1', //  hardcoded piped from fee taking
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '%collToken', '$2');

    const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        '&market', // hardcoded
        '%collAsset', // variable coll token
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
    );

    compV3BoostStrategy.addAction(borrowAction);
    compV3BoostStrategy.addAction(sellAction);
    compV3BoostStrategy.addAction(feeTakingAction);
    compV3BoostStrategy.addAction(supplyAction);
    compV3BoostStrategy.addAction(checkerAction);

    return compV3BoostStrategy.encodeForDsProxyCall();
};

const createCompV3EOABoostStrategy = () => {
    const compV3BoostStrategy = new dfs.Strategy('CompV3EOABoostStrategy');

    compV3BoostStrategy.addSubSlot('&market', 'address');
    compV3BoostStrategy.addSubSlot('&baseToken', 'address');
    compV3BoostStrategy.addSubSlot('&ratioState', 'uint256');
    compV3BoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const compV3Trigger = new dfs.triggers.CompV3RatioTrigger('0', '0', '0');
    compV3BoostStrategy.addTrigger(compV3Trigger);

    const borrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
        '&market', // comet proxy addr of used market
        '%amount', // variable amount to borrow
        '&proxy', // hardcoded
        '&eoa', // onBehalf hardcoded user
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&baseToken', // hardcoded base value
            '%collToken', // must stay variable
            '$1', //  hardcoded piped from fee taking
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '%collToken', '$2');

    const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        '&market', // hardcoded
        '%collAsset', // variable coll token
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
        '&eoa', // hardcoded onBehalf, supply to user
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

const createCompV3FlBoostStrategy = () => {
    const compV3BoostStrategy = new dfs.Strategy('CompV3FlBoostStrategy');

    compV3BoostStrategy.addSubSlot('&market', 'address');
    compV3BoostStrategy.addSubSlot('&baseToken', 'address');
    compV3BoostStrategy.addSubSlot('&ratioState', 'uint256');
    compV3BoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const compV3Trigger = new dfs.triggers.CompV3RatioTrigger('0', '0', '0');
    compV3BoostStrategy.addTrigger(compV3Trigger);

    const flBalancer = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%baseToken'],
        ['%boostAmount'],
    );
    const flAction = new dfs.actions.flashloan.FLAction(flBalancer);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&baseToken', // hardcoded base value
            '%collToken', // must stay variable
            '%amount', //  variable amount from Fl
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '%collToken', '$2');

    const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        '&market', // hardcoded
        '%collAsset', // variable coll token
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
    );

    const borrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
        '&market', // comet proxy addr of used market
        '$1', //  FL output
        '%flAddr', // variable flAddr
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState',
        '&targetRatio',
        '&market',
    );

    compV3BoostStrategy.addAction(flAction);
    compV3BoostStrategy.addAction(sellAction);
    compV3BoostStrategy.addAction(feeTakingAction);
    compV3BoostStrategy.addAction(supplyAction);
    compV3BoostStrategy.addAction(borrowAction);
    compV3BoostStrategy.addAction(checkerAction);

    return compV3BoostStrategy.encodeForDsProxyCall();
};

const createCompV3EOAFlBoostStrategy = () => {
    const compV3BoostStrategy = new dfs.Strategy('CompV3EOAFlBoostStrategy');

    compV3BoostStrategy.addSubSlot('&market', 'address');
    compV3BoostStrategy.addSubSlot('&baseToken', 'address');
    compV3BoostStrategy.addSubSlot('&ratioState', 'uint256');
    compV3BoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const compV3Trigger = new dfs.triggers.CompV3RatioTrigger('0', '0', '0');
    compV3BoostStrategy.addTrigger(compV3Trigger);

    const flBalancer = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%baseToken'],
        ['%boostAmount'],
    );
    const flAction = new dfs.actions.flashloan.FLAction(flBalancer);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&baseToken', // hardcoded base value
            '%collToken', // must stay variable
            '%amount', //  variable amount from Fl
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '%collToken', '$2');

    const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        '&market', // hardcoded
        '%collAsset', // variable coll token
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
        '&eoa', // hardcoded onBehalf
    );

    const borrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
        '&market', // comet proxy addr of used market
        '$1', //  FL output
        '%flAddr', // variable flAddr
        '&eoa', // hardcoded onBehalf
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

const createAaveV3BoostStrategy = () => {
    const aaveV3BoostStrategy = new dfs.Strategy('AaveV3Boost');

    aaveV3BoostStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3BoostStrategy.addSubSlot('&checkBoostState', 'uint256');
    aaveV3BoostStrategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3BoostStrategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3BoostStrategy.addSubSlot('&enableAsColl', 'bool');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger('0', '0', '0');
    aaveV3BoostStrategy.addTrigger(aaveV3Trigger);

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from withdraw action
        '%dfsFeeDivider', // defaults at 0.05%
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

    aaveV3BoostStrategy.addAction(borrowAction);
    aaveV3BoostStrategy.addAction(sellAction);
    aaveV3BoostStrategy.addAction(feeTakingAction);
    aaveV3BoostStrategy.addAction(supplyAction);
    aaveV3BoostStrategy.addAction(checkerAction);

    return aaveV3BoostStrategy.encodeForDsProxyCall();
};

const createAaveFLV3BoostStrategy = () => {
    const aaveV3BoostStrategy = new dfs.Strategy('AaveFLV3Boost');

    aaveV3BoostStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3BoostStrategy.addSubSlot('&checkBoostState', 'uint256');
    aaveV3BoostStrategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3BoostStrategy.addSubSlot('&useOnBehalf', 'bool');
    aaveV3BoostStrategy.addSubSlot('&enableAsColl', 'bool');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger('0', '0', '0');
    aaveV3BoostStrategy.addTrigger(aaveV3Trigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%collAddr'],
        ['%loanAmount'],
        nullAddress,
        [],
    );

    aaveV3BoostStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
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

    aaveV3BoostStrategy.addAction(sellAction);
    aaveV3BoostStrategy.addAction(feeTakingAction);
    aaveV3BoostStrategy.addAction(supplyAction);
    aaveV3BoostStrategy.addAction(borrowAction);
    aaveV3BoostStrategy.addAction(checkerAction);

    return aaveV3BoostStrategy.encodeForDsProxyCall();
};

const createAaveV3RepayStrategy = () => {
    const aaveV3RepayStrategy = new dfs.Strategy('AaveV3Repay');

    aaveV3RepayStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3RepayStrategy.addSubSlot('&checkRepayState', 'uint256');
    aaveV3RepayStrategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3RepayStrategy.addSubSlot('&useOnBehalf', 'bool');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger('0', '0', '0');
    aaveV3RepayStrategy.addTrigger(aaveV3Trigger);

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as debt can differ
        '$2', // hardcoded output from withdraw action
        '%dfsFeeDivider', // defaults at 0.05%
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

    aaveV3RepayStrategy.addAction(withdrawAction);
    aaveV3RepayStrategy.addAction(sellAction);
    aaveV3RepayStrategy.addAction(feeTakingAction);
    aaveV3RepayStrategy.addAction(paybackAction);
    aaveV3RepayStrategy.addAction(checkerAction);

    return aaveV3RepayStrategy.encodeForDsProxyCall();
};

const createAaveFLV3RepayStrategy = () => {
    const aaveV3RepayStrategy = new dfs.Strategy('AaveFLV3Repay');

    aaveV3RepayStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3RepayStrategy.addSubSlot('&checkRepayState', 'uint256');
    aaveV3RepayStrategy.addSubSlot('&useDefaultMarket', 'bool');
    aaveV3RepayStrategy.addSubSlot('&useOnBehalf', 'bool');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger('0', '0', '0');
    aaveV3RepayStrategy.addTrigger(aaveV3Trigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%collAddr'],
        ['%loanAmount'],
        nullAddress,
        [],
    );

    aaveV3RepayStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from sell
        '%dfsFeeDivider', // defaults at 0.05%
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

    aaveV3RepayStrategy.addAction(sellAction);
    aaveV3RepayStrategy.addAction(feeTakingAction);
    aaveV3RepayStrategy.addAction(paybackAction);
    aaveV3RepayStrategy.addAction(withdrawAction);
    aaveV3RepayStrategy.addAction(checkerAction);

    return aaveV3RepayStrategy.encodeForDsProxyCall();
};

const createAaveV3RepayOnPriceStrategy = () => {
    const aaveV3RepayOnPriceStrategy = new dfs.Strategy('AaveV3RepayOnPrice');

    aaveV3RepayOnPriceStrategy.addSubSlot('&collAsset', 'address');
    aaveV3RepayOnPriceStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3RepayOnPriceStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3RepayOnPriceStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3RepayOnPriceStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3RepayOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3RepayOnPriceStrategy.addSubSlot('&useOnBehalf', 'bool');

    const aaveV3Trigger = new dfs.triggers.AaveV3QuotePriceTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // must stay variable backend sets gasCost
        '&debtAsset',
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
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

const createAaveV3FlRepayOnPriceStrategy = () => {
    const aaveV3FlRepayOnPriceStrategy = new dfs.Strategy('AaveV3FlRepayOnPrice');

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // must stay variable backend sets gasCost
        '&debtAsset',
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
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

const aaveV3CloseActions = {
    flAction: () =>
        new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.AaveV3FlashLoanAction(
                ['%debtAsset'],
                ['%repayAmount'], // cant pipe in FL actions :(
                ['%AAVE_NO_DEBT_MODE'],
                '%nullAddress',
            ),
        ),

    paybackAction: () =>
        new dfs.actions.aaveV3.AaveV3PaybackAction(
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

    withdrawAction: () =>
        new dfs.actions.aaveV3.AaveV3WithdrawAction(
            '%true', // useDefaultMarket - true or will revert
            '&nullAddress', // market
            '%withdrawAmount', // kept variable (can support partial close later)
            '&proxy',
            '&collAssetId', // one subscription - one token pair
        ),

    sellAction: () =>
        new dfs.actions.basic.SellAction(
            formatExchangeObj(
                '&collAsset',
                '&debtAsset', // one subscription - one token pair
                '%swapAmount', // amount to sell is variable
                '%exchangeWrapper', // exchange wrapper can change
            ),
            '&proxy', // hardcoded take from user proxy
            '&proxy', // hardcoded send to user proxy
        ),

    feeTakingActionFL: () =>
        new dfs.actions.basic.GasFeeAction(
            '%gasCost', // must stay variable backend sets gasCost
            '&debtAsset',
            '$4', // hardcoded output from sell action
            '%dfsFeeDivider', // defaults at 0.05%
        ),

    feeTakingAction: () =>
        new dfs.actions.basic.GasFeeAction(
            '%gasCost', // must stay variable backend sets gasCost
            '&debtAsset',
            '$2', // hardcoded output from sell action
            '%dfsFeeDivider', // defaults at 0.05%
        ),

    feeTakingActionFLColl: () =>
        new dfs.actions.basic.GasFeeAction(
            '%gasCost', // must stay variable backend sets gasCost
            '&collAsset',
            '$3', // hardcoded output from sell action
            '%dfsFeeDivider', // defaults at 0.05%
        ),

    feeTakingActionColl: () =>
        new dfs.actions.basic.GasFeeAction(
            '%gasCost', // must stay variable backend sets gasCost
            '&collAsset',
            '$1', // hardcoded output from sell action
            '%dfsFeeDivider', // defaults at 0.05%
        ),

    sendRepayFL: () =>
        new dfs.actions.basic.SendTokenAction(
            '&debtAsset',
            '%flAddr', // kept variable this can change (FL must be paid back to work)
            '$1', // hardcoded output from FL action
        ),

    sendDebt: () =>
        new dfs.actions.basic.SendTokenAndUnwrapAction(
            '&debtAsset',
            '&eoa', // hardcoded so only proxy owner receives amount
            '%amountToRecipient(maxUint)', // will always be maxUint
        ),

    sendColl: () =>
        new dfs.actions.basic.SendTokenAndUnwrapAction(
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

const createAaveV3CloseToDebtStrategy = () => {
    const strategyName = 'AaveV3CloseToDebt';

    const aaveCloseStrategy = createAaveCloseStrategyBase(strategyName);

    aaveCloseStrategy.addAction(aaveV3CloseActions.withdrawAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sellAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.feeTakingAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.paybackAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendDebt());

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createAaveV3CloseToDebtWithMaximumGasPriceStrategy = () => {
    const strategyName = 'AaveV3CloseToDebtWithMaximumGasPrice';

    const aaveCloseStrategy = createAaveCloseStrategyBase(strategyName);

    // This is a second trigger.
    // Default close trigger for ratio set in createAaveCloseStrategyBase()
    aaveCloseStrategy.addTrigger(new dfs.triggers.GasPriceTrigger('0'));

    aaveCloseStrategy.addAction(aaveV3CloseActions.withdrawAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sellAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.feeTakingAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.paybackAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendDebt());

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createAaveV3FLCloseToDebtStrategy = () => {
    const strategyName = 'AaveV3FLCloseToDebt';

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

const createAaveV3FLCloseToDebtWithMaximumGasPriceStrategy = () => {
    const strategyName = 'AaveV3FLCloseToDebtWithMaximumGasPrice';

    const aaveCloseStrategy = createAaveCloseStrategyBase(strategyName);

    aaveCloseStrategy.addTrigger(new dfs.triggers.GasPriceTrigger('0'));

    aaveCloseStrategy.addAction(aaveV3CloseActions.flAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.paybackAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.withdrawAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sellAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.feeTakingActionFL());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendRepayFL());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendDebt());

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createAaveV3CloseToCollStrategy = () => {
    const strategyName = 'AaveV3CloseToColl';

    const aaveCloseStrategy = createAaveCloseStrategyBase(strategyName);

    aaveCloseStrategy.addAction(aaveV3CloseActions.withdrawAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.feeTakingActionColl());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sellAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.paybackAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendDebt());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendColl());

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createAaveV3CloseToCollWithMaximumGasPriceStrategy = () => {
    const strategyName = 'AaveV3CloseToCollWithMaximumGasPrice';

    const aaveCloseStrategy = createAaveCloseStrategyBase(strategyName);

    aaveCloseStrategy.addTrigger(new dfs.triggers.GasPriceTrigger('0'));

    aaveCloseStrategy.addAction(aaveV3CloseActions.withdrawAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.feeTakingActionColl());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sellAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.paybackAction());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendDebt());
    aaveCloseStrategy.addAction(aaveV3CloseActions.sendColl());

    return aaveCloseStrategy.encodeForDsProxyCall();
};

const createAaveV3FLCloseToCollStrategy = () => {
    const strategyName = 'AaveV3FLCloseToColl';

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

const createAaveV3FLCloseToCollWithMaximumGasPriceStrategy = () => {
    const strategyName = 'AaveV3FLCloseToCollWithMaximumGasPrice';

    const aaveCloseStrategy = createAaveCloseStrategyBase(strategyName);

    aaveCloseStrategy.addTrigger(new dfs.triggers.GasPriceTrigger('0'));

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

const createCompV2RepayStrategy = () => {
    const compV2RepayStrategy = new dfs.Strategy('CompV2Repay');

    compV2RepayStrategy.addSubSlot('&targetRatio', 'uint256');
    compV2RepayStrategy.addSubSlot('&checkRepayState', 'uint256');

    const compV2Trigger = new dfs.triggers.CompoundRatioTrigger('0', '0', '0');
    compV2RepayStrategy.addTrigger(compV2Trigger);

    const withdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
        '%cCollAddr', // variable (backend picks which asset to swap)
        '%amount', // must stay variable
        '&proxy', // hardcoded to address
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '%debtAddr', // must stay variable
            '$1', //  hardcoded from withdraw
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as debt can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const paybackAction = new dfs.actions.compound.CompoundPaybackAction(
        '%cCollAddr', // variable cToken coll address
        '$3', // amount hardcoded
        '&proxy', // hardcoded from address
        '&proxy', // hardcoded onBehalf address
    );

    const checkerAction = new dfs.actions.checkers.CompoundV2RatioCheckAction(
        '&checkRepayState', // hardcoded repay state
        '&targetRatio', // hardcoded target ratio
    );

    compV2RepayStrategy.addAction(withdrawAction);
    compV2RepayStrategy.addAction(sellAction);
    compV2RepayStrategy.addAction(feeTakingAction);
    compV2RepayStrategy.addAction(paybackAction);
    compV2RepayStrategy.addAction(checkerAction);

    return compV2RepayStrategy.encodeForDsProxyCall();
};

const createCompFLV2RepayStrategy = () => {
    const compV2RepayStrategy = new dfs.Strategy('CompFLV2Repay');

    compV2RepayStrategy.addSubSlot('&targetRatio', 'uint256');
    compV2RepayStrategy.addSubSlot('&checkRepayState', 'uint256');

    const compV2Trigger = new dfs.triggers.CompoundRatioTrigger('0', '0', '0');
    compV2RepayStrategy.addTrigger(compV2Trigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%collAddr'],
        ['%loanAmount'],
        nullAddress,
        [],
    );
    compV2RepayStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '%debtAddr', // must stay variable
            '%flAmount', //  must stay variable if FL has fees
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as debt can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const paybackAction = new dfs.actions.compound.CompoundPaybackAction(
        '%cDebtAddr', // variable cToken debt address
        '$3', // amount hardcoded
        '&proxy', // hardcoded from address
        '&proxy', // hardcoded onBehalf address
    );

    const withdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
        '%cCollAddr', // variable cToken (backend picks which asset to swap)
        '$1', // fl amount hardcoded from action
        '%flAddress', // repay the FL
    );

    const checkerAction = new dfs.actions.checkers.CompoundV2RatioCheckAction(
        '&checkRepayState', // hardcoded repay state
        '&targetRatio', // hardcoded target ratio
    );

    compV2RepayStrategy.addAction(sellAction);
    compV2RepayStrategy.addAction(feeTakingAction);
    compV2RepayStrategy.addAction(paybackAction);
    compV2RepayStrategy.addAction(withdrawAction);
    compV2RepayStrategy.addAction(checkerAction);

    return compV2RepayStrategy.encodeForDsProxyCall();
};

const createCompV2BoostStrategy = () => {
    const compV2BoostStrategy = new dfs.Strategy('CompV2Boost');

    compV2BoostStrategy.addSubSlot('&targetRatio', 'uint256');
    compV2BoostStrategy.addSubSlot('&checkBoostState', 'uint256');
    compV2BoostStrategy.addSubSlot('&enableAsColl', 'uint256');

    const compV2Trigger = new dfs.triggers.CompoundRatioTrigger('0', '0', '0');
    compV2BoostStrategy.addTrigger(compV2Trigger);

    const borrowAction = new dfs.actions.compound.CompoundBorrowAction(
        '%cDebtAddr', // cToken variable debt address
        '%amount', // amount to borrow (variable)
        '&proxy', // hardcoded to address
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from withdraw action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const supplyAction = new dfs.actions.compound.CompoundSupplyAction(
        '%cCollAddr', // cToken variable coll address
        '$3', // amount hardcoded from feeTakeAction
        '&proxy', // proxy hardcoded from address
        '&enableAsColl', // hardcoded always enable as coll
    );

    const checkerAction = new dfs.actions.checkers.CompoundV2RatioCheckAction(
        '&checkBoostState', // hardcoded boost state
        '&targetRatio', // hardcoded target ratio
    );

    compV2BoostStrategy.addAction(borrowAction);
    compV2BoostStrategy.addAction(sellAction);
    compV2BoostStrategy.addAction(feeTakingAction);
    compV2BoostStrategy.addAction(supplyAction);
    compV2BoostStrategy.addAction(checkerAction);

    return compV2BoostStrategy.encodeForDsProxyCall();
};

const createCompFLV2BoostStrategy = () => {
    const compV2BoostStrategy = new dfs.Strategy('CompFLV2Boost');

    compV2BoostStrategy.addSubSlot('&targetRatio', 'uint256');
    compV2BoostStrategy.addSubSlot('&checkBoostState', 'uint256');
    compV2BoostStrategy.addSubSlot('&enableAsColl', 'uint256');

    const compV2Trigger = new dfs.triggers.CompoundRatioTrigger('0', '0', '0');
    compV2BoostStrategy.addTrigger(compV2Trigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%debtAddr'],
        ['%loanAmount'],
        nullAddress,
        [],
    );

    compV2BoostStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const supplyAction = new dfs.actions.compound.CompoundSupplyAction(
        '%cCollAddr', // cToken variable coll address
        '$3', // amount hardcoded from feeTakeAction
        '&proxy', // proxy hardcoded from address
        '&enableAsColl', // hardcoded always enable as coll
    );

    const borrowAction = new dfs.actions.compound.CompoundBorrowAction(
        '%cDebtAddr', // cToken variable debt address
        '$1', // amount to borrow (variable)
        '%flAddress', // flAddress for fl repay
    );

    const checkerAction = new dfs.actions.checkers.CompoundV2RatioCheckAction(
        '&checkBoostState', // hardcoded boost state
        '&targetRatio', // hardcoded target ratio
    );

    compV2BoostStrategy.addAction(sellAction);
    compV2BoostStrategy.addAction(feeTakingAction);
    compV2BoostStrategy.addAction(supplyAction);
    compV2BoostStrategy.addAction(borrowAction);
    compV2BoostStrategy.addAction(checkerAction);

    return compV2BoostStrategy.encodeForDsProxyCall();
};

const createAaveV2RepayStrategy = () => {
    const aaveV2RepayStrategy = new dfs.Strategy('AaveV2Repay');

    aaveV2RepayStrategy.addSubSlot('&market', 'address');
    aaveV2RepayStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV2RepayStrategy.addSubSlot('&checkRepayState', 'uint256');

    const aaveV2Trigger = new dfs.triggers.AaveV2RatioTrigger('0', '0', '0');
    aaveV2RepayStrategy.addTrigger(aaveV2Trigger);

    const withdrawAction = new dfs.actions.aave.AaveWithdrawAction(
        '&market', // hardcoded market only main one is used
        '%collAddr', // variable (backend picks which asset to swap)
        '%amount', // must stay variable
        '&proxy', // hardcoded
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '%debtAddr', // must stay variable
            '$1', //  hardcoded from withdraw
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as debt can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const paybackAction = new dfs.actions.aave.AavePaybackAction(
        '&market', // hardcoded market only main one is used
        '%collAddr', // variable coll address
        '$3', // amount hardcoded
        '%rateMode', // variable type of debt
        '&proxy', // hardcoded from address
        '&proxy', // hardcoded onBehalf address
    );

    const checkerAction = new dfs.actions.checkers.AaveV2RatioCheckAction(
        '&checkRepayState', // hardcoded repay state
        '&targetRatio', // hardcoded target ratio
    );

    aaveV2RepayStrategy.addAction(withdrawAction);
    aaveV2RepayStrategy.addAction(sellAction);
    aaveV2RepayStrategy.addAction(feeTakingAction);
    aaveV2RepayStrategy.addAction(paybackAction);
    aaveV2RepayStrategy.addAction(checkerAction);

    return aaveV2RepayStrategy.encodeForDsProxyCall();
};

const createAaveFLV2RepayStrategy = () => {
    const aaveV2RepayStrategy = new dfs.Strategy('AaveFLV2Repay');

    aaveV2RepayStrategy.addSubSlot('&market', 'address');
    aaveV2RepayStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV2RepayStrategy.addSubSlot('&checkRepayState', 'uint256');

    const aaveV2Trigger = new dfs.triggers.AaveV2RatioTrigger('0', '0', '0');
    aaveV2RepayStrategy.addTrigger(aaveV2Trigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%collAddr'],
        ['%loanAmount'],
        nullAddress,
        [],
    );
    aaveV2RepayStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '%debtAddr', // must stay variable
            '%flAmount', //  must stay variable if FL has fees
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as debt can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const paybackAction = new dfs.actions.aave.AavePaybackAction(
        '&market', // hardcoded market only main one is used
        '%collAddr', // variable coll address
        '$3', // amount hardcoded
        '%rateMode', // variable type of debt
        '&proxy', // hardcoded from address
        '&proxy', // hardcoded onBehalf address
    );

    const withdrawAction = new dfs.actions.aave.AaveWithdrawAction(
        '&market', // hardcoded market only main one is used
        '%collAddr', // variable (backend picks which asset to swap)
        '$1', // fl amount hardcoded from action
        '%flAddress', // repay the FL
    );

    const checkerAction = new dfs.actions.checkers.AaveV2RatioCheckAction(
        '&checkRepayState', // hardcoded repay state
        '&targetRatio', // hardcoded target ratio
    );

    aaveV2RepayStrategy.addAction(sellAction);
    aaveV2RepayStrategy.addAction(feeTakingAction);
    aaveV2RepayStrategy.addAction(paybackAction);
    aaveV2RepayStrategy.addAction(withdrawAction);
    aaveV2RepayStrategy.addAction(checkerAction);

    return aaveV2RepayStrategy.encodeForDsProxyCall();
};

const createAaveV2BoostStrategy = () => {
    const aaveV2BoostStrategy = new dfs.Strategy('AaveV2Boost');

    aaveV2BoostStrategy.addSubSlot('&market', 'address');
    aaveV2BoostStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV2BoostStrategy.addSubSlot('&checkBoostState', 'uint256');
    aaveV2BoostStrategy.addSubSlot('&enableAsColl', 'uint256');

    const aaveV2Trigger = new dfs.triggers.AaveV2RatioTrigger('0', '0', '0');
    aaveV2BoostStrategy.addTrigger(aaveV2Trigger);

    const borrowAction = new dfs.actions.aave.AaveBorrowAction(
        '&market', // hardcoded market only main one is used
        '%debtAddr', // variable debt address
        '%amount', // amount to borrow (variable)
        '%rateMode', // depends on type of debt we want
        '&proxy', // hardcoded to address
        '&proxy', // hardcoded onBehalf address
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from withdraw action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const supplyAction = new dfs.actions.aave.AaveSupplyAction(
        '&market', // hardcoded market only main one is used
        '%collAddr', // variable coll address
        '$3', // amount hardcoded from feeTakeAction
        '&proxy', // proxy hardcoded from address
        '&proxy', // proxy hardcoded onBehalf address
        '&enableAsColl', // hardcoded always enable as coll
    );

    const checkerAction = new dfs.actions.checkers.AaveV2RatioCheckAction(
        '&checkBoostState', // hardcoded boost state
        '&targetRatio', // hardcoded target ratio
    );

    aaveV2BoostStrategy.addAction(borrowAction);
    aaveV2BoostStrategy.addAction(sellAction);
    aaveV2BoostStrategy.addAction(feeTakingAction);
    aaveV2BoostStrategy.addAction(supplyAction);
    aaveV2BoostStrategy.addAction(checkerAction);

    return aaveV2BoostStrategy.encodeForDsProxyCall();
};

const createAaveFLV2BoostStrategy = () => {
    const aaveV2BoostStrategy = new dfs.Strategy('AaveFLV2Boost');

    aaveV2BoostStrategy.addSubSlot('&market', 'address');
    aaveV2BoostStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV2BoostStrategy.addSubSlot('&checkBoostState', 'uint256');
    aaveV2BoostStrategy.addSubSlot('&enableAsColl', 'uint256');

    const aaveV2Trigger = new dfs.triggers.AaveV2RatioTrigger('0', '0', '0');
    aaveV2BoostStrategy.addTrigger(aaveV2Trigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%debtAddr'],
        ['%loanAmount'],
        nullAddress,
        [],
    );

    aaveV2BoostStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const supplyAction = new dfs.actions.aave.AaveSupplyAction(
        '&market', // hardcoded market only main one is used
        '%collAddr', // variable coll address
        '$3', // amount hardcoded from feeTakeAction
        '&proxy', // proxy hardcoded from address
        '&proxy', // proxy hardcoded onBehalf address
        '&enableAsColl', // hardcoded always enable as coll
    );

    const borrowAction = new dfs.actions.aave.AaveBorrowAction(
        '&market', // hardcoded market only main one is used
        '%debtAddr', // variable debt address
        '$1', // amount to borrow (variable)
        '%rateMode', // depends on type of debt we want
        '%flAddress', // flAddress for fl repay
        '&proxy', // hardcoded onBehalf address
    );

    const checkerAction = new dfs.actions.checkers.AaveV2RatioCheckAction(
        '&checkBoostState', // hardcoded boost state
        '&targetRatio', // hardcoded target ratio
    );

    aaveV2BoostStrategy.addAction(sellAction);
    aaveV2BoostStrategy.addAction(feeTakingAction);
    aaveV2BoostStrategy.addAction(supplyAction);
    aaveV2BoostStrategy.addAction(borrowAction);
    aaveV2BoostStrategy.addAction(checkerAction);

    return aaveV2BoostStrategy.encodeForDsProxyCall();
};

const createSparkBoostStrategy = () => {
    const sparkBoostStrategy = new dfs.Strategy('SparkBoost');

    sparkBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    sparkBoostStrategy.addSubSlot('&checkBoostState', 'uint256');
    sparkBoostStrategy.addSubSlot('&useDefaultMarket', 'bool');
    sparkBoostStrategy.addSubSlot('&useOnBehalf', 'bool');
    sparkBoostStrategy.addSubSlot('&enableAsColl', 'bool');

    const sparkTrigger = new dfs.triggers.SparkRatioTrigger('0', '0', '0');
    sparkBoostStrategy.addTrigger(sparkTrigger);

    const borrowAction = new dfs.actions.spark.SparkBorrowAction(
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from withdraw action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const supplyAction = new dfs.actions.spark.SparkSupplyAction(
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

    const checkerAction = new dfs.actions.checkers.SparkRatioCheckAction(
        '&checkBoostState',
        '&targetRatio',
    );

    sparkBoostStrategy.addAction(borrowAction);
    sparkBoostStrategy.addAction(sellAction);
    sparkBoostStrategy.addAction(feeTakingAction);
    sparkBoostStrategy.addAction(supplyAction);
    sparkBoostStrategy.addAction(checkerAction);

    return sparkBoostStrategy.encodeForDsProxyCall();
};

const createSparkFLBoostStrategy = () => {
    const sparkBoostStrategy = new dfs.Strategy('SparkFLBoost');

    sparkBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    sparkBoostStrategy.addSubSlot('&checkBoostState', 'uint256');
    sparkBoostStrategy.addSubSlot('&useDefaultMarket', 'bool');
    sparkBoostStrategy.addSubSlot('&useOnBehalf', 'bool');
    sparkBoostStrategy.addSubSlot('&enableAsColl', 'bool');

    const sparkTrigger = new dfs.triggers.SparkRatioTrigger('0', '0', '0');
    sparkBoostStrategy.addTrigger(sparkTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.SparkFlashLoanAction(
            ['%collAddr'],
            ['%loanAmount'],
            nullAddress,
            [],
        ),
    );

    sparkBoostStrategy.addAction(flAction);

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const supplyAction = new dfs.actions.spark.SparkSupplyAction(
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

    const borrowAction = new dfs.actions.spark.SparkBorrowAction(
        '&useDefaultMarket', // default market
        '%marketAddr', // hardcoded because default market is true
        '$1', // from Fl amount
        '%flAddr', // fl address that can change
        '%rateMode', // depends on type of debt we want
        '%assetId', // must stay variable can choose diff. asset
        '&useOnBehalf', // set to true hardcoded
        '%onBehalfAddr', // set to empty because flag is true
    );

    const checkerAction = new dfs.actions.checkers.SparkRatioCheckAction(
        '&checkBoostState',
        '&targetRatio',
    );

    sparkBoostStrategy.addAction(sellAction);
    sparkBoostStrategy.addAction(feeTakingAction);
    sparkBoostStrategy.addAction(supplyAction);
    sparkBoostStrategy.addAction(borrowAction);
    sparkBoostStrategy.addAction(checkerAction);

    return sparkBoostStrategy.encodeForDsProxyCall();
};

const createSparkRepayStrategy = () => {
    const sparkRepayStrategy = new dfs.Strategy('SparkRepay');

    sparkRepayStrategy.addSubSlot('&targetRatio', 'uint256');
    sparkRepayStrategy.addSubSlot('&checkRepayState', 'uint256');
    sparkRepayStrategy.addSubSlot('&useDefaultMarket', 'bool');
    sparkRepayStrategy.addSubSlot('&useOnBehalf', 'bool');

    const sparkTrigger = new dfs.triggers.SparkRatioTrigger('0', '0', '0');
    sparkRepayStrategy.addTrigger(sparkTrigger);

    const withdrawAction = new dfs.actions.spark.SparkWithdrawAction(
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as debt can differ
        '$2', // hardcoded output from withdraw action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const paybackAction = new dfs.actions.spark.SparkPaybackAction(
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

    const checkerAction = new dfs.actions.checkers.SparkRatioCheckAction(
        '&checkRepayState',
        '&targetRatio',
    );

    sparkRepayStrategy.addAction(withdrawAction);
    sparkRepayStrategy.addAction(sellAction);
    sparkRepayStrategy.addAction(feeTakingAction);
    sparkRepayStrategy.addAction(paybackAction);
    sparkRepayStrategy.addAction(checkerAction);

    return sparkRepayStrategy.encodeForDsProxyCall();
};

const createSparkFLRepayStrategy = () => {
    const sparkRepayStrategy = new dfs.Strategy('SparkFLRepay');

    sparkRepayStrategy.addSubSlot('&targetRatio', 'uint256');
    sparkRepayStrategy.addSubSlot('&checkRepayState', 'uint256');
    sparkRepayStrategy.addSubSlot('&useDefaultMarket', 'bool');
    sparkRepayStrategy.addSubSlot('&useOnBehalf', 'bool');

    const sparkTrigger = new dfs.triggers.SparkRatioTrigger('0', '0', '0');
    sparkRepayStrategy.addTrigger(sparkTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.SparkFlashLoanAction(
            ['%collAddr'],
            ['%loanAmount'],
            nullAddress,
            [],
        ),
    );

    sparkRepayStrategy.addAction(flAction);

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from sell
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const paybackAction = new dfs.actions.spark.SparkPaybackAction(
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

    const withdrawAction = new dfs.actions.spark.SparkWithdrawAction(
        '&useDefaultMarket', // set to true hardcoded
        '%market', // hardcoded because default market is true
        '$1', // repay fl amount
        '%flAddr', // flAddr not hardcoded (tx will fail if not returned to correct addr)
        '%assetId', // must stay variable can choose diff. asset
    );

    const checkerAction = new dfs.actions.checkers.SparkRatioCheckAction(
        '&checkRepayState',
        '&targetRatio',
    );

    sparkRepayStrategy.addAction(sellAction);
    sparkRepayStrategy.addAction(feeTakingAction);
    sparkRepayStrategy.addAction(paybackAction);
    sparkRepayStrategy.addAction(withdrawAction);
    sparkRepayStrategy.addAction(checkerAction);

    return sparkRepayStrategy.encodeForDsProxyCall();
};

const createLiquityDsrPaybackStrategy = () => {
    const liquityDsrPaybackStrategy = new dfs.Strategy('LiquityDsrPayback');
    liquityDsrPaybackStrategy.addSubSlot('&ratioState', 'uint8');
    liquityDsrPaybackStrategy.addSubSlot('&targetRatio', 'uint256');
    liquityDsrPaybackStrategy.addSubSlot('&daiAddress', 'address');
    liquityDsrPaybackStrategy.addSubSlot('&lusdAddress', 'uint256');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    liquityDsrPaybackStrategy.addTrigger(liquityRatioTrigger);

    const dsrWithdrawAction = new dfs.actions.maker.MakerDsrWithdrawAction(
        '%daiWithdrawAmount',
        '&proxy',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('&daiAddress', '&lusdAddress', '$1', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%strategyGasCost',
        '&lusdAddress',
        '$2',
    );

    const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '$3',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
        '&ratioState',
        '&targetRatio',
    );

    liquityDsrPaybackStrategy.addAction(dsrWithdrawAction);
    liquityDsrPaybackStrategy.addAction(sellAction);
    liquityDsrPaybackStrategy.addAction(feeTakingAction);
    liquityDsrPaybackStrategy.addAction(liquityPaybackAction);
    liquityDsrPaybackStrategy.addAction(liquityRatioCheckAction);

    return liquityDsrPaybackStrategy.encodeForDsProxyCall();
};

const createLiquityDsrSupplyStrategy = () => {
    const liquityDsrSupplyStrategy = new dfs.Strategy('LiquityDsrSupply');
    liquityDsrSupplyStrategy.addSubSlot('&ratioState', 'uint8');
    liquityDsrSupplyStrategy.addSubSlot('&targetRatio', 'uint256');
    liquityDsrSupplyStrategy.addSubSlot('&daiAddress', 'address');
    liquityDsrSupplyStrategy.addSubSlot('&wethAddress', 'uint256');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    liquityDsrSupplyStrategy.addTrigger(liquityRatioTrigger);

    const dsrWithdrawAction = new dfs.actions.maker.MakerDsrWithdrawAction(
        '%daiWithdrawAmount',
        '&proxy',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('&daiAddress', '&wethAddress', '$1', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%strategyGasCost',
        '&wethAddress',
        '$2',
    );

    const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
        '$3',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
        '&ratioState',
        '&targetRatio',
    );

    liquityDsrSupplyStrategy.addAction(dsrWithdrawAction);
    liquityDsrSupplyStrategy.addAction(sellAction);
    liquityDsrSupplyStrategy.addAction(feeTakingAction);
    liquityDsrSupplyStrategy.addAction(liquitySupplyAction);
    liquityDsrSupplyStrategy.addAction(liquityRatioCheckAction);

    return liquityDsrSupplyStrategy.encodeForDsProxyCall();
};

const createCurveUsdAdvancedRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('CurveUsdAdvancedRepayStrategy');

    repayStrategy.addSubSlot('&controllerAddress', 'address');
    repayStrategy.addSubSlot('&ratioState', 'uint8');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&collAddress', 'address');
    repayStrategy.addSubSlot('&crvUsdAddress', 'address');

    const curveUsdCollRatioTrigger = new dfs.triggers.CurveUsdCollRatioTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
    repayStrategy.addTrigger(curveUsdCollRatioTrigger);

    const curveUsdRepayAction = new dfs.actions.curveusd.CurveUsdRepayAction(
        '&controllerAddress', // taken from subdata
        '%collAmount', // calculated by backend
        '&eoa', // most likely wont be used as this will only be partial repay
        '%minAmount', // calculated by backend
        '%additionalData', // packed data for exchange
        '%gasUsed', // sent by backend
        '%dfsFeeDivider', // 400 (25bps)
    );

    const curveUsdCollRatioCheckAction = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '&ratioState', // taken from subdata
        '&targetRatio', // taken from subdata
        '&controllerAddress', // taken from subdata
    );

    repayStrategy.addAction(curveUsdRepayAction);
    repayStrategy.addAction(curveUsdCollRatioCheckAction);
    return repayStrategy.encodeForDsProxyCall();
};
const createCurveUsdRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('CurveUsdRepayStrategy');

    repayStrategy.addSubSlot('&controllerAddress', 'address');
    repayStrategy.addSubSlot('&ratioState', 'uint8');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&collAddress', 'address');
    repayStrategy.addSubSlot('&crvUsdAddress', 'address');

    const curveUsdCollRatioTrigger = new dfs.triggers.CurveUsdCollRatioTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
    repayStrategy.addTrigger(curveUsdCollRatioTrigger);

    const curveUsdWithdrawAction = new dfs.actions.curveusd.CurveUsdWithdrawAction(
        '&controllerAddress', // taken from subdata
        '&proxy', // piped
        '%repayAmount', // calculated by backend
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAddress', // taken from subdata
            '&crvUsdAddress', // taken from subdata
            '$1', // output of withdraw action
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy', // taken from subdata
        '&proxy', // taken from subdata
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&crvUsdAddress', // taken from subdata
        '$2', // output of sell action
    );
    const curveUsdPaybackAction = new dfs.actions.curveusd.CurveUsdPaybackAction(
        '&controllerAddress', // taken from subdata
        '&proxy', // piped
        '&proxy', // piped
        '&eoa', // piped
        '$3', // output of gas fee taker action
        '%maxActiveBand', // sent by backend
    );
    const curveUsdCollRatioCheckAction = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '&ratioState', // taken from subdata
        '&targetRatio', // taken from subdata
        '&controllerAddress', // taken from subdata
    );

    repayStrategy.addAction(curveUsdWithdrawAction);
    repayStrategy.addAction(sellAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(curveUsdPaybackAction);
    repayStrategy.addAction(curveUsdCollRatioCheckAction);
    return repayStrategy.encodeForDsProxyCall();
};

const createCurveUsdFLRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('CurveUsdFLRepayStrategy');

    repayStrategy.addSubSlot('&controllerAddress', 'address');
    repayStrategy.addSubSlot('&ratioState', 'uint8');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&collAddress', 'address');
    repayStrategy.addSubSlot('&crvUsdAddress', 'address');

    const curveUsdCollRatioTrigger = new dfs.triggers.CurveUsdCollRatioTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
    repayStrategy.addTrigger(curveUsdCollRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%collAddress'], // sent by backend (no piping available in fl actions)
        ['%loanAmount'], // sent by backend
        '%nullAddress',
        [],
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAddress', // taken from subdata
            '&crvUsdAddress', // taken from subdata
            '%boostAmount', // sent by backend, should be th same as amount flashloaned
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy', // piped
        '&proxy', // piped
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&crvUsdAddress', // taken from subdata
        '$2', // output of sell action
    );
    const curveUsdPaybackAction = new dfs.actions.curveusd.CurveUsdPaybackAction(
        '&controllerAddress', // taken from subdata
        '&proxy', // piped
        '&proxy', // piped
        '&eoa', // piped
        '$3', // output of gas fee taker action
        '%maxActiveBand', // sent by backend
    );
    const curveUsdWithdrawAction = new dfs.actions.curveusd.CurveUsdWithdrawAction(
        '&controllerAddress', // taken from subdata
        '%flAddr', // FLAction address
        '$1', // output of flaction address (flAmount+fee)
    );
    const curveUsdCollRatioCheckAction = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '&ratioState', // taken from subdata
        '&targetRatio', // taken from subdata
        '&controllerAddress', // taken from subdata
    );

    repayStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));
    repayStrategy.addAction(sellAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(curveUsdPaybackAction);
    repayStrategy.addAction(curveUsdWithdrawAction);
    repayStrategy.addAction(curveUsdCollRatioCheckAction);
    return repayStrategy.encodeForDsProxyCall();
};

const createCurveUsdBoostStrategy = () => {
    const boostStrategy = new dfs.Strategy('CurveUsdBoostStrategy');

    boostStrategy.addSubSlot('&controllerAddress', 'address');
    boostStrategy.addSubSlot('&ratioState', 'uint8');
    boostStrategy.addSubSlot('&targetRatio', 'uint256');
    boostStrategy.addSubSlot('&collAddress', 'address');
    boostStrategy.addSubSlot('&crvUsdAddress', 'address');

    const curveUsdCollRatioTrigger = new dfs.triggers.CurveUsdCollRatioTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
    boostStrategy.addTrigger(curveUsdCollRatioTrigger);

    const curveUsdBorrowAction = new dfs.actions.curveusd.CurveUsdBorrowAction(
        '&controllerAddress', // taken from subdata
        '&proxy', // taken from subdata
        '%boostAmount', // calculated by backend
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&crvUsdAddress', // taken from subdata
            '&collAddress', // taken from subdata
            '$1', // output of borrow action
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy', // piped
        '&proxy', // piped
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&collAddress', // taken from subdata
        '$2', // output of sell action
    );
    const supplyAction = new dfs.actions.curveusd.CurveUsdSupplyAction(
        '&controllerAddress', // taken from subdata
        '&proxy', // piped
        '&proxy', // piped
        '$3', // output of gas fee taker action
    );
    const curveUsdCollRatioCheckAction = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '&ratioState', // taken from subdata
        '&targetRatio', // taken from subdata
        '&controllerAddress', // taken from subdata
    );

    boostStrategy.addAction(curveUsdBorrowAction);
    boostStrategy.addAction(sellAction);
    boostStrategy.addAction(feeTakingAction);
    boostStrategy.addAction(supplyAction);
    boostStrategy.addAction(curveUsdCollRatioCheckAction);
    return boostStrategy.encodeForDsProxyCall();
};

const createCurveUsdFLCollBoostStrategy = () => {
    const boostStrategy = new dfs.Strategy('CurveUsdFLCollBoostStrategy');

    boostStrategy.addSubSlot('&controllerAddress', 'address');
    boostStrategy.addSubSlot('&ratioState', 'uint8');
    boostStrategy.addSubSlot('&targetRatio', 'uint256');
    boostStrategy.addSubSlot('&collAddress', 'address');
    boostStrategy.addSubSlot('&crvUsdAddress', 'address');

    const curveUsdCollRatioTrigger = new dfs.triggers.CurveUsdCollRatioTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
    boostStrategy.addTrigger(curveUsdCollRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%collAddress'], // sent by backend (no piping available in fl actions)
        ['%flAmount'], // sent by backend
        '%nullAddress',
        [],
    );

    const curveUsdAdjustAction = new dfs.actions.curveusd.CurveUsdAdjustAction(
        '&controllerAddress', // taken from subdata
        '&proxy', // piped
        '&proxy', // piped
        '%flAmount', // sent by backend, cant pipe fl output due to fee
        '%crvusdBoostAmount', // sent by backend
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&crvUsdAddress', // taken from subdata
            '&collAddress', // taken from subdata
            '$2', // output of adjust action (amount of borrowed crvusd)
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy', // piped
        '&proxy', // piped
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&collAddress', // taken from subdata
        '$3', // output of sell action
    );
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        ['&collAddress', '&collAddress'], // taken from subdata
        ['%flAddress', '&eoa'], // first one sent by backend, second piped
        ['$1', '%maxUint'], // first one piped to return fl, second one sent by backend
    );
    const curveUsdCollRatioCheckAction = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '&ratioState', // taken from subdata
        '&targetRatio', // taken from subdata
        '&controllerAddress', // taken from subdata
    );
    boostStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));
    boostStrategy.addAction(curveUsdAdjustAction);
    boostStrategy.addAction(sellAction);
    boostStrategy.addAction(feeTakingAction);
    boostStrategy.addAction(sendTokensAction);
    boostStrategy.addAction(curveUsdCollRatioCheckAction);
    return boostStrategy.encodeForDsProxyCall();
};

const createCurveUsdFLDebtBoostStrategy = () => {
    const boostStrategy = new dfs.Strategy('CurveUsdFLDebtBoostStrategy');

    boostStrategy.addSubSlot('&controllerAddress', 'address');
    boostStrategy.addSubSlot('&ratioState', 'uint8');
    boostStrategy.addSubSlot('&targetRatio', 'uint256');
    boostStrategy.addSubSlot('&collAddress', 'address');
    boostStrategy.addSubSlot('&crvUsdAddress', 'address');

    const curveUsdCollRatioTrigger = new dfs.triggers.CurveUsdCollRatioTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
    boostStrategy.addTrigger(curveUsdCollRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
        ['%crvUsdAddress'], // sent by backend (no piping available in fl actions)
        ['%flAmount'], // sent by backend
        '%nullAddress',
        [],
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&crvUsdAddress', // taken from subdata
            '&collAddress', // taken from subdata
            '%flAmount', // same number as fl amount, cant pipe fl output due to fee
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy', // piped
        '&proxy', // piped
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&collAddress', // taken from subdata
        '$2', // output of sell action
    );

    const curveUsdAdjustAction = new dfs.actions.curveusd.CurveUsdAdjustAction(
        '&controllerAddress', // taken from subdata
        '&proxy', // piped
        '%flAddress', // sent by backend
        '$3', // we supply whatever left after gas fee taker
        '$1', // we borrow enough to payback flashloan
    );
    const curveUsdCollRatioCheckAction = new dfs.actions.checkers.CurveUsdCollRatioCheck(
        '&ratioState', // taken from subdata
        '&targetRatio', // taken from subdata
        '&controllerAddress', // taken from subdata
    );
    boostStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));
    boostStrategy.addAction(sellAction);
    boostStrategy.addAction(feeTakingAction);
    boostStrategy.addAction(curveUsdAdjustAction);
    boostStrategy.addAction(curveUsdCollRatioCheckAction);
    return boostStrategy.encodeForDsProxyCall();
};

const createCurveUsdPaybackStrategy = () => {
    const paybackStrategy = new dfs.Strategy('CurveUsdPaybackStrategy');

    paybackStrategy.addSubSlot('&controllerAddr', 'address');
    paybackStrategy.addSubSlot('&addressToPullTokensFrom', 'address');
    paybackStrategy.addSubSlot('&positionOwner', 'address');
    paybackStrategy.addSubSlot('&amountToPayback', 'uint256');
    paybackStrategy.addSubSlot('&crvUsdAddress', 'address');

    const curveUsdHealthRatioTrigger = new dfs.triggers.CurveUsdHealthRatioTrigger(
        nullAddress,
        nullAddress,
        '0',
    );
    paybackStrategy.addTrigger(curveUsdHealthRatioTrigger);

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        '&crvUsdAddress', // taken from subdata
        '&addressToPullTokensFrom', // taken from subdata
        '%amountToPayback', // sent by backend, either amount from sub data or maxUint for whole balance
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&crvUsdAddress', // taken from subdata
        '$1', // output of pull token action
    );
    const curveUsdPaybackAction = new dfs.actions.curveusd.CurveUsdPaybackAction(
        '&controllerAddr', // taken from subdata,
        '&proxy', // piped
        '&positionOwner', // taken from subdata
        '&eoa', // piped
        '$2', // output of gas fee taker action
        '%maxActiveBand', // sent by backend
    );
    paybackStrategy.addAction(pullTokenAction);
    paybackStrategy.addAction(feeTakingAction);
    paybackStrategy.addAction(curveUsdPaybackAction);
    return paybackStrategy.encodeForDsProxyCall();
};

const createMorphoBlueBoostStrategy = () => {
    const boostStrategy = new dfs.Strategy('MorphoBlueBoostStrategy');

    boostStrategy.addSubSlot('&loanToken', 'address');
    boostStrategy.addSubSlot('&collateralToken', 'address');
    boostStrategy.addSubSlot('&oracle', 'address');
    boostStrategy.addSubSlot('&irm', 'address');
    boostStrategy.addSubSlot('&lltv', 'uint256');
    boostStrategy.addSubSlot('&ratioState', 'uint8');
    boostStrategy.addSubSlot('&targetRatio', 'uint256');
    boostStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(0, nullAddress, 0, 0);
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&collateralToken',
        '$2', // output of sell action
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

const createMorphoBlueFLDebtBoostStrategy = () => {
    const boostStrategy = new dfs.Strategy('MorphoBlueFLDebtBoostStrategy');

    boostStrategy.addSubSlot('&loanToken', 'address');
    boostStrategy.addSubSlot('&collateralToken', 'address');
    boostStrategy.addSubSlot('&oracle', 'address');
    boostStrategy.addSubSlot('&irm', 'address');
    boostStrategy.addSubSlot('&lltv', 'uint256');
    boostStrategy.addSubSlot('&ratioState', 'uint8');
    boostStrategy.addSubSlot('&targetRatio', 'uint256');
    boostStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(0, nullAddress, 0, 0);
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&collateralToken',
        '$2', // output of sell action
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
const createMorphoBlueFLCollBoostStrategy = () => {
    const boostStrategy = new dfs.Strategy('MorphoBlueFLCollBoostStrategy');

    boostStrategy.addSubSlot('&loanToken', 'address');
    boostStrategy.addSubSlot('&collateralToken', 'address');
    boostStrategy.addSubSlot('&oracle', 'address');
    boostStrategy.addSubSlot('&irm', 'address');
    boostStrategy.addSubSlot('&lltv', 'uint256');
    boostStrategy.addSubSlot('&ratioState', 'uint8');
    boostStrategy.addSubSlot('&targetRatio', 'uint256');
    boostStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(0, nullAddress, 0, 0);
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&collateralToken',
        '$4', // output of sell action
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
const createMorphoBlueRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('MorphoBlueRepayStrategy');

    repayStrategy.addSubSlot('&loanToken', 'address');
    repayStrategy.addSubSlot('&collateralToken', 'address');
    repayStrategy.addSubSlot('&oracle', 'address');
    repayStrategy.addSubSlot('&irm', 'address');
    repayStrategy.addSubSlot('&lltv', 'uint256');
    repayStrategy.addSubSlot('&ratioState', 'uint8');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(0, nullAddress, 0, 0);
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&loanToken',
        '$2', // output of sell action
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
const createMorphoBlueFLCollRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('MorphoBlueFLCollRepayStrategy');

    repayStrategy.addSubSlot('&loanToken', 'address');
    repayStrategy.addSubSlot('&collateralToken', 'address');
    repayStrategy.addSubSlot('&oracle', 'address');
    repayStrategy.addSubSlot('&irm', 'address');
    repayStrategy.addSubSlot('&lltv', 'uint256');
    repayStrategy.addSubSlot('&ratioState', 'uint8');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(0, nullAddress, 0, 0);
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&loanToken',
        '$2', // output of sell action
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
const createMorphoBlueFLDebtRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('MorphoBlueFLDebtRepayStrategy');

    repayStrategy.addSubSlot('&loanToken', 'address');
    repayStrategy.addSubSlot('&collateralToken', 'address');
    repayStrategy.addSubSlot('&oracle', 'address');
    repayStrategy.addSubSlot('&irm', 'address');
    repayStrategy.addSubSlot('&lltv', 'uint256');
    repayStrategy.addSubSlot('&ratioState', 'uint8');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&user', 'address');

    const morphoBlueRatioTrigger = new dfs.triggers.MorphoBlueRatioTrigger(0, nullAddress, 0, 0);
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // sent by backend
        '&loanToken',
        '$4', // output of sell action
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

// @dev This also supports boost on target price strategies for existing positions
const createAaveV3OpenOrderFromCollStrategy = () => {
    const aaveV3OpenOrderFromCollStrategy = new dfs.Strategy('AaveV3OpenOrderFromCollStrategy');

    aaveV3OpenOrderFromCollStrategy.addSubSlot('&collAsset', 'address');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&useOnBehalf', 'bool');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3OpenOrderFromCollStrategy.addTrigger(trigger);

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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collAsset',
        '$2', // output of sell action
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
    aaveV3OpenOrderFromCollStrategy.addAction(borrowAction);
    aaveV3OpenOrderFromCollStrategy.addAction(sellAction);
    aaveV3OpenOrderFromCollStrategy.addAction(feeTakingAction);
    aaveV3OpenOrderFromCollStrategy.addAction(supplyAction);
    aaveV3OpenOrderFromCollStrategy.addAction(openRatioCheckAction);
    return aaveV3OpenOrderFromCollStrategy.encodeForDsProxyCall();
};
// @dev This also supports boost on target price strategies for existing positions
const createAaveV3FLOpenOrderFromCollStrategy = () => {
    const aaveV3OpenOrderFromCollStrategy = new dfs.Strategy('AaveV3FLOpenOrderFromCollStrategy');

    aaveV3OpenOrderFromCollStrategy.addSubSlot('&collAsset', 'address');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3OpenOrderFromCollStrategy.addSubSlot('&useOnBehalf', 'bool');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3OpenOrderFromCollStrategy.addTrigger(trigger);

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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collAsset',
        '$2', // output of sell action
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
    aaveV3OpenOrderFromCollStrategy.addAction(flAction);
    aaveV3OpenOrderFromCollStrategy.addAction(sellAction);
    aaveV3OpenOrderFromCollStrategy.addAction(feeTakingAction);
    aaveV3OpenOrderFromCollStrategy.addAction(supplyAction);
    aaveV3OpenOrderFromCollStrategy.addAction(borrowAction);
    aaveV3OpenOrderFromCollStrategy.addAction(openRatioCheckAction);
    return aaveV3OpenOrderFromCollStrategy.encodeForDsProxyCall();
};
const createAaveV3FLOpenOrderFromDebtStrategy = () => {
    const aaveV3OpenOrderFromDebtStrategy = new dfs.Strategy('AaveV3FLOpenOrderFromDebtStrategy');

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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collAsset',
        '$4', // output of sell action
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
const createMorphoBlueBoostOnTargetPriceStrategy = () => {
    const morphoBlueBoostOnTargetPriceStrategy = new dfs.Strategy(
        'MorphoBlueBoostOnTargetPriceStrategy',
    );

    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&loanToken', 'address');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&collateralToken', 'address');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&oracle', 'address');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&irm', 'address');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&lltv', 'uint256');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    morphoBlueBoostOnTargetPriceStrategy.addSubSlot('&user', 'address');

    const trigger = new dfs.triggers.MorphoBluePriceTrigger(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&price',
        '&priceState',
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collateralToken',
        '$2',
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
const createMorphoBlueFLBoostOnTargetPriceStrategy = () => {
    const morphoBlueFLBoostOnTargetPriceStrategy = new dfs.Strategy(
        'MorphoBlueFLBoostOnTargetPriceStrategy',
    );

    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&loanToken', 'address');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&collateralToken', 'address');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&oracle', 'address');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&irm', 'address');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&lltv', 'uint256');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    morphoBlueFLBoostOnTargetPriceStrategy.addSubSlot('&user', 'address');

    const trigger = new dfs.triggers.MorphoBluePriceTrigger(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&price',
        '&priceState',
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collateralToken',
        '$2',
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

const createLiquityV2RepayStrategy = () => {
    const liquityV2RepayStrategy = new dfs.Strategy('LiquityV2RepayStrategy');
    liquityV2RepayStrategy.addSubSlot('&market', 'address');
    liquityV2RepayStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2RepayStrategy.addSubSlot('&collToken', 'address');
    liquityV2RepayStrategy.addSubSlot('&boldToken', 'address');
    liquityV2RepayStrategy.addSubSlot('&ratioState', 'uint256');
    liquityV2RepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const liquityV2RatioTrigger = new dfs.triggers.LiquityV2RatioTrigger(
        '&market',
        '&troveId',
        '&ratio',
        '&ratioState',
    );
    liquityV2RepayStrategy.addTrigger(liquityV2RatioTrigger);

    const liquityV2WithdrawAction = new dfs.actions.liquityV2.LiquityV2WithdrawAction(
        '&market',
        '&proxy',
        '&troveId',
        '%amount', // sent by backend
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collToken',
            '&boldToken',
            '$1',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&boldToken',
        '$2',
    );
    const liquityV2PaybackAction = new dfs.actions.liquityV2.LiquityV2PaybackAction(
        '&market',
        '&proxy',
        '&troveId',
        '$3',
    );
    const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
        '&market',
        '&troveId',
        '&ratioState',
        '&targetRatio',
    );
    liquityV2RepayStrategy.addAction(liquityV2WithdrawAction);
    liquityV2RepayStrategy.addAction(sellAction);
    liquityV2RepayStrategy.addAction(feeTakingAction);
    liquityV2RepayStrategy.addAction(liquityV2PaybackAction);
    liquityV2RepayStrategy.addAction(liquityV2RatioCheckAction);

    return liquityV2RepayStrategy.encodeForDsProxyCall();
};
const createLiquityV2FLRepayStrategy = () => {
    const liquityV2FLRepayStrategy = new dfs.Strategy('LiquityV2FLRepayStrategy');
    liquityV2FLRepayStrategy.addSubSlot('&market', 'address');
    liquityV2FLRepayStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2FLRepayStrategy.addSubSlot('&collToken', 'address');
    liquityV2FLRepayStrategy.addSubSlot('&boldToken', 'address');
    liquityV2FLRepayStrategy.addSubSlot('&ratioState', 'uint256');
    liquityV2FLRepayStrategy.addSubSlot('&targetRatio', 'uint256');
    liquityV2FLRepayStrategy.addSubSlot('&CollActionType.WITHDRAW', 'uint8');
    liquityV2FLRepayStrategy.addSubSlot('&DebtActionType.PAYBACK', 'uint8');

    const liquityV2RatioTrigger = new dfs.triggers.LiquityV2RatioTrigger(
        '&market',
        '&troveId',
        '&ratio',
        '&ratioState',
    );
    liquityV2FLRepayStrategy.addTrigger(liquityV2RatioTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collToken'], // sent by backend. No piping available in fl actions
            ['%flAmount'], // sent by backend
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collToken',
            '&boldToken',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&boldToken',
        '$2',
    );
    const liquityV2AdjustAction = new dfs.actions.liquityV2.LiquityV2AdjustAction(
        '&market',
        '&proxy',
        '%flAddress', // sent by backend
        '&troveId',
        '$1',
        '$3',
        '%maxUpfrontFee', // sent by backend, hardcode to 0 as there is no additional borrow,
        '&CollActionType.WITHDRAW',
        '&DebtActionType.PAYBACK',
    );
    const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
        '&market',
        '&troveId',
        '&ratioState',
        '&targetRatio',
    );
    liquityV2FLRepayStrategy.addAction(flAction);
    liquityV2FLRepayStrategy.addAction(sellAction);
    liquityV2FLRepayStrategy.addAction(feeTakingAction);
    liquityV2FLRepayStrategy.addAction(liquityV2AdjustAction);
    liquityV2FLRepayStrategy.addAction(liquityV2RatioCheckAction);

    return liquityV2FLRepayStrategy.encodeForDsProxyCall();
};
const createLiquityV2BoostStrategy = () => {
    const liquityV2BoostStrategy = new dfs.Strategy('LiquityV2BoostStrategy');
    liquityV2BoostStrategy.addSubSlot('&market', 'address');
    liquityV2BoostStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2BoostStrategy.addSubSlot('&collToken', 'address');
    liquityV2BoostStrategy.addSubSlot('&boldToken', 'address');
    liquityV2BoostStrategy.addSubSlot('&ratioState', 'uint256');
    liquityV2BoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const liquityV2RatioTrigger = new dfs.triggers.LiquityV2RatioTrigger(
        '&market',
        '&troveId',
        '&ratio',
        '&ratioState',
    );
    liquityV2BoostStrategy.addTrigger(liquityV2RatioTrigger);

    const liquityV2BorrowAction = new dfs.actions.liquityV2.LiquityV2BorrowAction(
        '&market',
        '&proxy',
        '&troveId',
        '%amount', // sent by backend
        '%maxUpfrontFee', // sent by backend
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&boldToken',
            '&collToken',
            '$1',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&collToken',
        '$2',
    );
    const liquityV2SupplyAction = new dfs.actions.liquityV2.LiquityV2SupplyAction(
        '&market',
        '&proxy',
        '&collToken',
        '&troveId',
        '$3',
    );
    const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
        '&market',
        '&troveId',
        '&ratioState',
        '&targetRatio',
    );
    liquityV2BoostStrategy.addAction(liquityV2BorrowAction);
    liquityV2BoostStrategy.addAction(sellAction);
    liquityV2BoostStrategy.addAction(feeTakingAction);
    liquityV2BoostStrategy.addAction(liquityV2SupplyAction);
    liquityV2BoostStrategy.addAction(liquityV2RatioCheckAction);

    return liquityV2BoostStrategy.encodeForDsProxyCall();
};
const createLiquityV2FLBoostStrategy = () => {
    const liquityV2FLBoostStrategy = new dfs.Strategy('LiquityV2FLBoostStrategy');
    liquityV2FLBoostStrategy.addSubSlot('&market', 'address');
    liquityV2FLBoostStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2FLBoostStrategy.addSubSlot('&collToken', 'address');
    liquityV2FLBoostStrategy.addSubSlot('&boldToken', 'address');
    liquityV2FLBoostStrategy.addSubSlot('&ratioState', 'uint256');
    liquityV2FLBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    liquityV2FLBoostStrategy.addSubSlot('&CollActionType.SUPPLY', 'uint8');
    liquityV2FLBoostStrategy.addSubSlot('&DebtActionType.BORROW', 'uint8');

    const liquityV2RatioTrigger = new dfs.triggers.LiquityV2RatioTrigger(
        '&market',
        '&troveId',
        '&ratio',
        '&ratioState',
    );
    liquityV2FLBoostStrategy.addTrigger(liquityV2RatioTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%boldToken'], // sent by backend. No piping available in fl actions
            ['%flAmount'], // sent by backend
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&boldToken',
            '&collToken',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&collToken',
        '$2',
    );
    const liquityV2AdjustAction = new dfs.actions.liquityV2.LiquityV2AdjustAction(
        '&market',
        '&proxy',
        '%flAddress', // sent by backend
        '&troveId',
        '$3',
        '$1',
        '%maxUpfrontFee', // sent by backend,
        '&CollActionType.SUPPLY',
        '&DebtActionType.BORROW',
    );
    const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
        '&market',
        '&troveId',
        '&ratioState',
        '&targetRatio',
    );
    liquityV2FLBoostStrategy.addAction(flAction);
    liquityV2FLBoostStrategy.addAction(sellAction);
    liquityV2FLBoostStrategy.addAction(feeTakingAction);
    liquityV2FLBoostStrategy.addAction(liquityV2AdjustAction);
    liquityV2FLBoostStrategy.addAction(liquityV2RatioCheckAction);

    return liquityV2FLBoostStrategy.encodeForDsProxyCall();
};
const createLiquityV2FLBoostWithCollStrategy = () => {
    const liquityV2FLBoostWithCollStrategy = new dfs.Strategy('LiquityV2FLBoostWithCollStrategy');
    liquityV2FLBoostWithCollStrategy.addSubSlot('&market', 'address');
    liquityV2FLBoostWithCollStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2FLBoostWithCollStrategy.addSubSlot('&collToken', 'address');
    liquityV2FLBoostWithCollStrategy.addSubSlot('&boldToken', 'address');
    liquityV2FLBoostWithCollStrategy.addSubSlot('&ratioState', 'uint256');
    liquityV2FLBoostWithCollStrategy.addSubSlot('&targetRatio', 'uint256');
    liquityV2FLBoostWithCollStrategy.addSubSlot('&CollActionType.SUPPLY', 'uint8');
    liquityV2FLBoostWithCollStrategy.addSubSlot('&DebtActionType.BORROW', 'uint8');

    const liquityV2RatioTrigger = new dfs.triggers.LiquityV2RatioTrigger(
        '&market',
        '&troveId',
        '&ratio',
        '&ratioState',
    );
    liquityV2FLBoostWithCollStrategy.addTrigger(liquityV2RatioTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collToken'], // sent by backend. No piping available in fl actions
            ['%flAmount'], // sent by backend
        ),
    );
    const liquityV2AdjustAction = new dfs.actions.liquityV2.LiquityV2AdjustAction(
        '&market',
        '&proxy',
        '&proxy',
        '&troveId',
        '%flAmount', // sent by backend
        '%debtAmount', // sent by backend
        '%maxUpfrontFee', // sent by backend,
        '&CollActionType.SUPPLY',
        '&DebtActionType.BORROW',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&boldToken',
            '&collToken',
            '$2', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&collToken',
        '$3',
    );
    const liquityV2SupplyAction = new dfs.actions.liquityV2.LiquityV2SupplyAction(
        '&market',
        '&proxy',
        '&collToken',
        '&troveId',
        '$4',
    );
    const liquityV2WithdrawAction = new dfs.actions.liquityV2.LiquityV2WithdrawAction(
        '&market',
        '%flAddress', // sent by backend
        '&troveId',
        '$1',
    );
    const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
        '&market',
        '&troveId',
        '&ratioState',
        '&targetRatio',
    );
    liquityV2FLBoostWithCollStrategy.addAction(flAction);
    liquityV2FLBoostWithCollStrategy.addAction(liquityV2AdjustAction);
    liquityV2FLBoostWithCollStrategy.addAction(sellAction);
    liquityV2FLBoostWithCollStrategy.addAction(feeTakingAction);
    liquityV2FLBoostWithCollStrategy.addAction(liquityV2SupplyAction);
    liquityV2FLBoostWithCollStrategy.addAction(liquityV2WithdrawAction);
    liquityV2FLBoostWithCollStrategy.addAction(liquityV2RatioCheckAction);

    return liquityV2FLBoostWithCollStrategy.encodeForDsProxyCall();
};
const createLiquityV2CloseToCollStrategy = () => {
    const liquityV2CloseToCollStrategy = new dfs.Strategy('LiquityV2CloseToCollStrategy');

    liquityV2CloseToCollStrategy.addSubSlot('&market', 'address');
    liquityV2CloseToCollStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2CloseToCollStrategy.addSubSlot('&collToken', 'uint256');
    liquityV2CloseToCollStrategy.addSubSlot('&boldToken', 'uint256');
    liquityV2CloseToCollStrategy.addSubSlot('&wethToken', 'uint256');
    liquityV2CloseToCollStrategy.addSubSlot('&gasCompensation', 'uint256'); // 0.0375 weth
    // only used by backend to determine which action to call
    liquityV2CloseToCollStrategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8');

    const closePriceTrigger = new dfs.triggers.ClosePriceTrigger(
        '&collToken',
        '&lowerTriggerPrice',
        '&upperTriggerPrice',
    );
    liquityV2CloseToCollStrategy.addTrigger(closePriceTrigger);

    const withdrawAction = new dfs.actions.liquityV2.LiquityV2WithdrawAction(
        '&market',
        '&proxy',
        '&troveId',
        '%amount', // sent by backend
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collToken',
            '&boldToken',
            '$1',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const liquityV2CloseAction = new dfs.actions.liquityV2.LiquityV2CloseAction(
        '&market',
        '&proxy',
        '&proxy',
        '&troveId',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&collToken',
        '$3',
    );
    // return:
    // 1. 0.0375 weth for gas compensation. This will unwrap weth to eth and send it to the eoa
    // 2. All coll tokens that are left after the close. If this is weth, it will also be unwrapped
    // 3. All bold tokens that are left after the close
    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        ['&wethToken', '&collToken', '&boldToken'],
        ['&eoa', '&eoa', '&eoa'],
        [
            '&gasCompensation',
            '%max(uint)', // sent by backend
            '%max(uint)', // sent by backend
        ],
    );

    liquityV2CloseToCollStrategy.addAction(withdrawAction);
    liquityV2CloseToCollStrategy.addAction(sellAction);
    liquityV2CloseToCollStrategy.addAction(liquityV2CloseAction);
    liquityV2CloseToCollStrategy.addAction(feeTakingAction);
    liquityV2CloseToCollStrategy.addAction(sendTokensAction);

    return liquityV2CloseToCollStrategy.encodeForDsProxyCall();
};
const createLiquityV2FLCloseToCollStrategy = () => {
    const liquityV2FLCloseToCollStrategy = new dfs.Strategy('LiquityV2FLCloseToCollStrategy');

    liquityV2FLCloseToCollStrategy.addSubSlot('&market', 'address');
    liquityV2FLCloseToCollStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2FLCloseToCollStrategy.addSubSlot('&collToken', 'uint256');
    liquityV2FLCloseToCollStrategy.addSubSlot('&boldToken', 'uint256');
    liquityV2FLCloseToCollStrategy.addSubSlot('&wethToken', 'uint256');
    liquityV2FLCloseToCollStrategy.addSubSlot('&gasCompensation', 'uint256'); // 0.0375 weth
    // only used by backend to determine which action to call
    liquityV2FLCloseToCollStrategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8');

    const closePriceTrigger = new dfs.triggers.ClosePriceTrigger(
        '&collToken',
        '&lowerTriggerPrice',
        '&upperTriggerPrice',
    );
    liquityV2FLCloseToCollStrategy.addTrigger(closePriceTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collToken'], // sent by backend. No piping available in fl actions
            ['%flAmount'], // sent by backend
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collToken',
            '&boldToken',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const liquityV2CloseAction = new dfs.actions.liquityV2.LiquityV2CloseAction(
        '&market',
        '&proxy',
        '&proxy',
        '&troveId',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&collToken',
        '$3',
    );
    // return flashloan. This has to be separate action, because we don't want to unwrap weth
    const sendFLAction = new dfs.actions.basic.SendTokenAction(
        '&collToken',
        '%flAddress', // sent by backend
        '$1',
    );
    // return:
    // 1. 0.0375 weth for gas compensation. This will unwrap weth to eth and send it to the eoa
    // 2. All coll tokens that are left after the close. If this is weth, it will also be unwrapped
    // 3. All bold tokens that are left after the close
    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        ['&wethToken', '&collToken', '&boldToken'],
        ['&eoa', '&eoa', '&eoa'],
        [
            '&gasCompensation',
            '%max(uint)', // sent by backend
            '%max(uint)', // sent by backend
        ],
    );

    liquityV2FLCloseToCollStrategy.addAction(flAction);
    liquityV2FLCloseToCollStrategy.addAction(sellAction);
    liquityV2FLCloseToCollStrategy.addAction(liquityV2CloseAction);
    liquityV2FLCloseToCollStrategy.addAction(feeTakingAction);
    liquityV2FLCloseToCollStrategy.addAction(sendFLAction);
    liquityV2FLCloseToCollStrategy.addAction(sendTokensAction);

    return liquityV2FLCloseToCollStrategy.encodeForDsProxyCall();
};
const createLiquityV2FLCloseToDebtStrategy = () => {
    const liquityV2FLCloseToDebtStrategy = new dfs.Strategy('LiquityV2FLCloseToDebtStrategy');

    liquityV2FLCloseToDebtStrategy.addSubSlot('&market', 'address');
    liquityV2FLCloseToDebtStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2FLCloseToDebtStrategy.addSubSlot('&collToken', 'uint256');
    liquityV2FLCloseToDebtStrategy.addSubSlot('&boldToken', 'uint256');
    liquityV2FLCloseToDebtStrategy.addSubSlot('&wethToken', 'uint256');
    liquityV2FLCloseToDebtStrategy.addSubSlot('&gasCompensation', 'uint256'); // 0.0375 weth
    // only used by backend to determine which action to call
    liquityV2FLCloseToDebtStrategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8');

    const closePriceTrigger = new dfs.triggers.ClosePriceTrigger(
        '&collToken',
        '&lowerTriggerPrice',
        '&upperTriggerPrice',
    );
    liquityV2FLCloseToDebtStrategy.addTrigger(closePriceTrigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%boldToken'], // sent by backend. No piping available in fl actions
            ['%flAmount'], // sent by backend
        ),
    );
    const liquityV2CloseAction = new dfs.actions.liquityV2.LiquityV2CloseAction(
        '&market',
        '&proxy',
        '&proxy',
        '&troveId',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collToken',
            '&boldToken',
            '$2',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&boldToken',
        '$3',
    );
    // return:
    // 1. Bold flashloan amount to flAddress
    // 2. All bold that's left after the close and fl repayment
    // 3. 0.0375 weth for gas compensation. This will unwrap weth to eth and send it to the eoa
    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        ['&boldToken', '&boldToken', '&wethToken'],
        [
            '%flAddress', // sent by backend
            '&eoa',
            '&eoa',
        ],
        [
            '$1',
            '%max(uint)', // sent by backend
            '&gasCompensation',
        ],
    );

    liquityV2FLCloseToDebtStrategy.addAction(flAction);
    liquityV2FLCloseToDebtStrategy.addAction(liquityV2CloseAction);
    liquityV2FLCloseToDebtStrategy.addAction(sellAction);
    liquityV2FLCloseToDebtStrategy.addAction(feeTakingAction);
    liquityV2FLCloseToDebtStrategy.addAction(sendTokensAction);

    return liquityV2FLCloseToDebtStrategy.encodeForDsProxyCall();
};
const createLiquityV2BoostOnPriceStrategy = () => {
    const liquityV2BoostOnPriceStrategy = new dfs.Strategy('LiquityV2BoostOnPriceStrategy');

    liquityV2BoostOnPriceStrategy.addSubSlot('&market', 'uint256');
    liquityV2BoostOnPriceStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2BoostOnPriceStrategy.addSubSlot('&collToken', 'uint256');
    liquityV2BoostOnPriceStrategy.addSubSlot('&boldToken', 'uint256');
    liquityV2BoostOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');

    const trigger = new dfs.triggers.LiquityV2QuotePriceTrigger('&market', '&price', '&priceState');
    liquityV2BoostOnPriceStrategy.addTrigger(trigger);

    const liquityV2BorrowAction = new dfs.actions.liquityV2.LiquityV2BorrowAction(
        '&market',
        '&proxy',
        '&troveId',
        '%amount', // sent by backend
        '%maxUpfrontFee', // sent by backend
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&boldToken',
            '&collToken',
            '$1',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&collToken',
        '$2',
    );
    const liquityV2SupplyAction = new dfs.actions.liquityV2.LiquityV2SupplyAction(
        '&market',
        '&proxy',
        '&collToken',
        '&troveId',
        '$3',
    );
    const targetRatioCheckAction = new dfs.actions.checkers.LiquityV2TargetRatioCheckAction(
        '&market',
        '&troveId',
        '&targetRatio',
    );
    liquityV2BoostOnPriceStrategy.addAction(liquityV2BorrowAction);
    liquityV2BoostOnPriceStrategy.addAction(sellAction);
    liquityV2BoostOnPriceStrategy.addAction(feeTakingAction);
    liquityV2BoostOnPriceStrategy.addAction(liquityV2SupplyAction);
    liquityV2BoostOnPriceStrategy.addAction(targetRatioCheckAction);
    return liquityV2BoostOnPriceStrategy.encodeForDsProxyCall();
};
const createLiquityV2FLBoostOnPriceStrategy = () => {
    const liquityV2FLBoostOnPriceStrategy = new dfs.Strategy('LiquityV2FLBoostOnPriceStrategy');
    liquityV2FLBoostOnPriceStrategy.addSubSlot('&market', 'address');
    liquityV2FLBoostOnPriceStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2FLBoostOnPriceStrategy.addSubSlot('&collToken', 'uint256');
    liquityV2FLBoostOnPriceStrategy.addSubSlot('&boldToken', 'uint256');
    liquityV2FLBoostOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    liquityV2FLBoostOnPriceStrategy.addSubSlot('&CollActionType.SUPPLY', 'uint8');
    liquityV2FLBoostOnPriceStrategy.addSubSlot('&DebtActionType.BORROW', 'uint8');

    const trigger = new dfs.triggers.LiquityV2QuotePriceTrigger('&market', '&price', '&priceState');
    liquityV2FLBoostOnPriceStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%boldToken'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&boldToken',
            '&collToken',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&collToken',
        '$2',
    );
    const liquityV2AdjustAction = new dfs.actions.liquityV2.LiquityV2AdjustAction(
        '&market',
        '&proxy',
        '%flAddress', // sent by backend
        '&troveId',
        '$3',
        '$1',
        '%maxUpfrontFee', // sent by backend,
        '&CollActionType.SUPPLY',
        '&DebtActionType.BORROW',
    );
    const targetRatioCheckAction = new dfs.actions.checkers.LiquityV2TargetRatioCheckAction(
        '&market',
        '&troveId',
        '&targetRatio',
    );
    liquityV2FLBoostOnPriceStrategy.addAction(flAction);
    liquityV2FLBoostOnPriceStrategy.addAction(sellAction);
    liquityV2FLBoostOnPriceStrategy.addAction(feeTakingAction);
    liquityV2FLBoostOnPriceStrategy.addAction(liquityV2AdjustAction);
    liquityV2FLBoostOnPriceStrategy.addAction(targetRatioCheckAction);

    return liquityV2FLBoostOnPriceStrategy.encodeForDsProxyCall();
};
const createLiquityV2FLBoostWithCollOnPriceStrategy = () => {
    const liquityV2FLBoostWithCollOnPriceStrategy = new dfs.Strategy(
        'LiquityV2FLBoostWithCollOnPriceStrategy',
    );
    liquityV2FLBoostWithCollOnPriceStrategy.addSubSlot('&market', 'address');
    liquityV2FLBoostWithCollOnPriceStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2FLBoostWithCollOnPriceStrategy.addSubSlot('&collToken', 'uint256');
    liquityV2FLBoostWithCollOnPriceStrategy.addSubSlot('&boldToken', 'uint256');
    liquityV2FLBoostWithCollOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    liquityV2FLBoostWithCollOnPriceStrategy.addSubSlot('&CollActionType.SUPPLY', 'uint8');
    liquityV2FLBoostWithCollOnPriceStrategy.addSubSlot('&DebtActionType.BORROW', 'uint8');

    const trigger = new dfs.triggers.LiquityV2QuotePriceTrigger('&market', '&price', '&priceState');
    liquityV2FLBoostWithCollOnPriceStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collToken'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );
    const liquityV2AdjustAction = new dfs.actions.liquityV2.LiquityV2AdjustAction(
        '&market',
        '&proxy',
        '&proxy',
        '&troveId',
        '%flAmount', // sent by backend
        '%debtAmount', // sent by backend
        '%maxUpfrontFee', // sent by backend,
        '&CollActionType.SUPPLY',
        '&DebtActionType.BORROW',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&boldToken',
            '&collToken',
            '$2', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&collToken', // sent by backend
        '$3',
    );
    const liquityV2SupplyAction = new dfs.actions.liquityV2.LiquityV2SupplyAction(
        '&market',
        '&proxy',
        '&collToken',
        '&troveId',
        '$4',
    );
    const liquityV2WithdrawAction = new dfs.actions.liquityV2.LiquityV2WithdrawAction(
        '&market',
        '%flAddress', // sent by backend
        '&troveId',
        '$1',
    );
    const targetRatioCheckAction = new dfs.actions.checkers.LiquityV2TargetRatioCheckAction(
        '&market',
        '&troveId',
        '&targetRatio',
    );
    liquityV2FLBoostWithCollOnPriceStrategy.addAction(flAction);
    liquityV2FLBoostWithCollOnPriceStrategy.addAction(liquityV2AdjustAction);
    liquityV2FLBoostWithCollOnPriceStrategy.addAction(sellAction);
    liquityV2FLBoostWithCollOnPriceStrategy.addAction(feeTakingAction);
    liquityV2FLBoostWithCollOnPriceStrategy.addAction(liquityV2SupplyAction);
    liquityV2FLBoostWithCollOnPriceStrategy.addAction(liquityV2WithdrawAction);
    liquityV2FLBoostWithCollOnPriceStrategy.addAction(targetRatioCheckAction);

    return liquityV2FLBoostWithCollOnPriceStrategy.encodeForDsProxyCall();
};
const createLiquityV2RepayOnPriceStrategy = () => {
    const liquityV2RepayOnPriceStrategy = new dfs.Strategy('LiquityV2RepayOnPriceStrategy');

    liquityV2RepayOnPriceStrategy.addSubSlot('&market', 'uint256');
    liquityV2RepayOnPriceStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2RepayOnPriceStrategy.addSubSlot('&collToken', 'uint256');
    liquityV2RepayOnPriceStrategy.addSubSlot('&boldToken', 'uint256');
    liquityV2RepayOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');

    const trigger = new dfs.triggers.LiquityV2QuotePriceTrigger('&market', '&price', '&priceState');
    liquityV2RepayOnPriceStrategy.addTrigger(trigger);
    const liquityV2WithdrawAction = new dfs.actions.liquityV2.LiquityV2WithdrawAction(
        '&market',
        '&proxy',
        '&troveId',
        '%amount', // sent by backend
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collToken',
            '&boldToken',
            '$1',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&boldToken',
        '$2',
    );
    const liquityV2PaybackAction = new dfs.actions.liquityV2.LiquityV2PaybackAction(
        '&market',
        '&proxy',
        '&troveId',
        '$3',
    );
    const targetRatioCheckAction = new dfs.actions.checkers.LiquityV2TargetRatioCheckAction(
        '&market',
        '&troveId',
        '&targetRatio',
    );
    liquityV2RepayOnPriceStrategy.addAction(liquityV2WithdrawAction);
    liquityV2RepayOnPriceStrategy.addAction(sellAction);
    liquityV2RepayOnPriceStrategy.addAction(feeTakingAction);
    liquityV2RepayOnPriceStrategy.addAction(liquityV2PaybackAction);
    liquityV2RepayOnPriceStrategy.addAction(targetRatioCheckAction);
    return liquityV2RepayOnPriceStrategy.encodeForDsProxyCall();
};
const createLiquityV2FLRepayOnPriceStrategy = () => {
    const liquityV2FLRepayOnPriceStrategy = new dfs.Strategy('LiquityV2FLRepayOnPriceStrategy');
    liquityV2FLRepayOnPriceStrategy.addSubSlot('&market', 'address');
    liquityV2FLRepayOnPriceStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2FLRepayOnPriceStrategy.addSubSlot('&collToken', 'uint256');
    liquityV2FLRepayOnPriceStrategy.addSubSlot('&boldToken', 'uint256');
    liquityV2FLRepayOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    liquityV2FLRepayOnPriceStrategy.addSubSlot('&CollActionType.WITHDRAW', 'uint8');
    liquityV2FLRepayOnPriceStrategy.addSubSlot('&DebtActionType.PAYBACK', 'uint8');

    const trigger = new dfs.triggers.LiquityV2QuotePriceTrigger('&market', '&price', '&priceState');
    liquityV2FLRepayOnPriceStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collToken'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collToken',
            '&boldToken',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&boldToken',
        '$2',
    );
    const liquityV2AdjustAction = new dfs.actions.liquityV2.LiquityV2AdjustAction(
        '&market',
        '&proxy',
        '%flAddress', // sent by backend
        '&troveId',
        '$1',
        '$3',
        '%maxUpfrontFee', // sent by backend, hardcode to 0 as there is no additional borrow,
        '&CollActionType.WITHDRAW',
        '&DebtActionType.PAYBACK',
    );
    const targetRatioCheckAction = new dfs.actions.checkers.LiquityV2TargetRatioCheckAction(
        '&market',
        '&troveId',
        '&targetRatio',
    );
    liquityV2FLRepayOnPriceStrategy.addAction(flAction);
    liquityV2FLRepayOnPriceStrategy.addAction(sellAction);
    liquityV2FLRepayOnPriceStrategy.addAction(feeTakingAction);
    liquityV2FLRepayOnPriceStrategy.addAction(liquityV2AdjustAction);
    liquityV2FLRepayOnPriceStrategy.addAction(targetRatioCheckAction);

    return liquityV2FLRepayOnPriceStrategy.encodeForDsProxyCall();
};
const createFluidT1RepayStrategy = () => {
    const fluidT1RepayStrategy = new dfs.Strategy('FluidT1RepayStrategy');
    fluidT1RepayStrategy.addSubSlot('&nftId', 'uint256');
    fluidT1RepayStrategy.addSubSlot('&vault', 'address');
    fluidT1RepayStrategy.addSubSlot('&ratioState', 'uint256');
    fluidT1RepayStrategy.addSubSlot('&targetRatio', 'uint256');
    fluidT1RepayStrategy.addSubSlot('&wrapEth', 'bool'); // hardcode to true

    const fluidRatioTrigger = new dfs.triggers.FluidRatioTrigger('nftId', 'ratio', 'ratioState');
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '%debtToken', // sent by backend. If debtToken is ETH, pass WETH address
        '$2',
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
const createFluidT1FLRepayStrategy = () => {
    const fluidT1FLRepayStrategy = new dfs.Strategy('FluidT1FLRepayStrategy');
    fluidT1FLRepayStrategy.addSubSlot('&nftId', 'uint256');
    fluidT1FLRepayStrategy.addSubSlot('&vault', 'address');
    fluidT1FLRepayStrategy.addSubSlot('&ratioState', 'uint256');
    fluidT1FLRepayStrategy.addSubSlot('&targetRatio', 'uint256');
    fluidT1FLRepayStrategy.addSubSlot('&wrapEth', 'bool'); // hardcode to true
    fluidT1FLRepayStrategy.addSubSlot('&CollActionType.WITHDRAW', 'uint8');
    fluidT1FLRepayStrategy.addSubSlot('&DebtActionType.PAYBACK', 'uint8');

    const fluidRatioTrigger = new dfs.triggers.FluidRatioTrigger('nftId', 'ratio', 'ratioState');
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '%debtToken', // sent by backend. If debtToken is ETH, pass WETH address
        '$2',
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
const createFluidT1BoostStrategy = () => {
    const fluidT1BoostStrategy = new dfs.Strategy('FluidT1BoostStrategy');
    fluidT1BoostStrategy.addSubSlot('&nftId', 'uint256');
    fluidT1BoostStrategy.addSubSlot('&vault', 'address');
    fluidT1BoostStrategy.addSubSlot('&ratioState', 'uint256');
    fluidT1BoostStrategy.addSubSlot('&targetRatio', 'uint256');
    fluidT1BoostStrategy.addSubSlot('&wrapEth', 'bool'); // hardcode to true

    const fluidRatioTrigger = new dfs.triggers.FluidRatioTrigger('nftId', 'ratio', 'ratioState');
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '%collToken', // sent by backend. If collToken is ETH, pass WETH address
        '$2',
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
const createFluidT1FLBoostStrategy = () => {
    const fluidT1FLBoostStrategy = new dfs.Strategy('FluidT1FLBoostStrategy');
    fluidT1FLBoostStrategy.addSubSlot('&nftId', 'uint256');
    fluidT1FLBoostStrategy.addSubSlot('&vault', 'address');
    fluidT1FLBoostStrategy.addSubSlot('&ratioState', 'uint256');
    fluidT1FLBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    fluidT1FLBoostStrategy.addSubSlot('&wrapEth', 'bool'); // hardcode to true
    fluidT1FLBoostStrategy.addSubSlot('&CollActionType.SUPPLY', 'uint8');
    fluidT1FLBoostStrategy.addSubSlot('&DebtActionType.BORROW', 'uint8');

    const fluidRatioTrigger = new dfs.triggers.FluidRatioTrigger('nftId', 'ratio', 'ratioState');
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '%collToken', // sent by backend. If collToken is ETH, pass WETH address
        '$2',
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

const createLiquityV2PaybackFromSPStrategy = () => {
    const liquityV2PaybackFromSPStrategy = new dfs.Strategy('LiquityV2PaybackFromSPStrategy');
    liquityV2PaybackFromSPStrategy.addSubSlot('&market', 'address');
    liquityV2PaybackFromSPStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2PaybackFromSPStrategy.addSubSlot('&boldToken', 'uint256');
    liquityV2PaybackFromSPStrategy.addSubSlot('&targetRatio', 'uint256');
    liquityV2PaybackFromSPStrategy.addSubSlot('&ratioState', 'uint256');

    const liquityV2RatioTrigger = new dfs.triggers.LiquityV2RatioTrigger(
        '&market',
        '&troveId',
        '&ratio',
        '&ratioState',
    );
    liquityV2PaybackFromSPStrategy.addTrigger(liquityV2RatioTrigger);

    const liquityV2WithdrawSP = new dfs.actions.liquityV2.LiquityV2SPWithdrawAction(
        '%marketForSP',
        '&proxy', // where to send bold tokens
        '&proxy', // where to send coll. gains
        '%boldAmount', // calc. by backend to hit ratio trigger
        '%doClaim', // set false by backend
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gas', // sent by backend
        '&boldToken',
        '$1',
    );

    const liquityV2Payback = new dfs.actions.liquityV2.LiquityV2PaybackAction(
        '&market',
        '&proxy',
        '&troveId',
        '$2',
    );

    const liquityV2RatioCheckAction = new dfs.actions.checkers.LiquityV2RatioCheckAction(
        '&market',
        '&troveId',
        '&ratioState',
        '&targetRatio',
    );

    liquityV2PaybackFromSPStrategy.addAction(liquityV2WithdrawSP);
    liquityV2PaybackFromSPStrategy.addAction(feeTakingAction);
    liquityV2PaybackFromSPStrategy.addAction(liquityV2Payback);
    liquityV2PaybackFromSPStrategy.addAction(liquityV2RatioCheckAction);

    return liquityV2PaybackFromSPStrategy.encodeForDsProxyCall();
};

const createLiquityV2InterestRateAdjustmentStrategy = () => {
    const liquityV2InterestRateAdjustmentStrategy = new dfs.Strategy(
        'LiquityV2InterestRateAdjustmentStrategy',
    );
    liquityV2InterestRateAdjustmentStrategy.addSubSlot('&market', 'address');
    liquityV2InterestRateAdjustmentStrategy.addSubSlot('&troveId', 'uint256');
    liquityV2InterestRateAdjustmentStrategy.addSubSlot('&interestRateChange', 'uint256');

    const liquityV2AdjustRateDebtInFrontTrigger =
        new dfs.triggers.LiquityV2AdjustRateDebtInFrontTrigger(
            'market',
            'troveId',
            'criticalDebtInFrontLimit',
            'nonCriticalDebtInFrontLimit',
        );
    liquityV2InterestRateAdjustmentStrategy.addTrigger(liquityV2AdjustRateDebtInFrontTrigger);

    const liquityV2AdjustInterestRateAction =
        new dfs.actions.liquityV2.LiquityV2AdjustInterestRateAction(
            '&market',
            '&troveId',
            '%newAnnualInterestRate', // sent by backend
            '%upperHint', // sent by backend
            '%lowerHint', // sent by backend
            '%maxUpfrontFee', // sent by backend
        );

    const liquityV2NewInterestRateCheckerAction =
        new dfs.actions.checkers.LiquityV2NewInterestRateCheckerAction(
            '&market',
            '&troveId',
            '&interestRateChange',
        );

    liquityV2InterestRateAdjustmentStrategy.addAction(liquityV2AdjustInterestRateAction);
    liquityV2InterestRateAdjustmentStrategy.addAction(liquityV2NewInterestRateCheckerAction);

    return liquityV2InterestRateAdjustmentStrategy.encodeForDsProxyCall();
};

const createCompV3BoostOnPriceStrategy = () => {
    const compV3BoostOnPriceStrategy = new dfs.Strategy('CompV3BoostOnPriceStrategy');
    compV3BoostOnPriceStrategy.addSubSlot('&market', 'address');
    compV3BoostOnPriceStrategy.addSubSlot('&collToken', 'address');
    compV3BoostOnPriceStrategy.addSubSlot('&baseToken', 'address');
    compV3BoostOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    compV3BoostOnPriceStrategy.addSubSlot('&ratioState', 'uint8');
    compV3BoostOnPriceStrategy.addSubSlot('&user', 'address');

    const compV3PriceTrigger = new dfs.triggers.CompV3PriceTrigger(
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
    );
    compV3BoostOnPriceStrategy.addTrigger(compV3PriceTrigger);

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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collToken',
        '$2',
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
    compV3BoostOnPriceStrategy.addAction(compV3BorrowAction);
    compV3BoostOnPriceStrategy.addAction(sellAction);
    compV3BoostOnPriceStrategy.addAction(feeTakingAction);
    compV3BoostOnPriceStrategy.addAction(supplyAction);
    compV3BoostOnPriceStrategy.addAction(compV3RatioCheckAction);

    return compV3BoostOnPriceStrategy.encodeForDsProxyCall();
};
const createCompV3FLBoostOnPriceStrategy = () => {
    const compV3FLBoostOnPriceStrategy = new dfs.Strategy('CompV3FLBoostOnPriceStrategy');
    compV3FLBoostOnPriceStrategy.addSubSlot('&market', 'address');
    compV3FLBoostOnPriceStrategy.addSubSlot('&collToken', 'address');
    compV3FLBoostOnPriceStrategy.addSubSlot('&baseToken', 'address');
    compV3FLBoostOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    compV3FLBoostOnPriceStrategy.addSubSlot('&ratioState', 'uint8');
    compV3FLBoostOnPriceStrategy.addSubSlot('&user', 'address');

    const compV3PriceTrigger = new dfs.triggers.CompV3PriceTrigger(
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
    );
    compV3FLBoostOnPriceStrategy.addTrigger(compV3PriceTrigger);

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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collToken',
        '$2',
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
    compV3FLBoostOnPriceStrategy.addAction(flAction);
    compV3FLBoostOnPriceStrategy.addAction(sellAction);
    compV3FLBoostOnPriceStrategy.addAction(feeTakingAction);
    compV3FLBoostOnPriceStrategy.addAction(supplyAction);
    compV3FLBoostOnPriceStrategy.addAction(compV3BorrowAction);
    compV3FLBoostOnPriceStrategy.addAction(compV3RatioCheckAction);

    return compV3FLBoostOnPriceStrategy.encodeForDsProxyCall();
};

const createCompV3RepayOnPriceStrategy = () => {
    const compV3RepayOnPriceStrategy = new dfs.Strategy('CompV3RepayOnPriceStrategy');
    compV3RepayOnPriceStrategy.addSubSlot('&market', 'address');
    compV3RepayOnPriceStrategy.addSubSlot('&collToken', 'address');
    compV3RepayOnPriceStrategy.addSubSlot('&baseToken', 'address');
    compV3RepayOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    compV3RepayOnPriceStrategy.addSubSlot('&ratioState', 'uint8');
    compV3RepayOnPriceStrategy.addSubSlot('&user', 'address');

    const compV3PriceTrigger = new dfs.triggers.CompV3PriceTrigger(
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
    );
    compV3RepayOnPriceStrategy.addTrigger(compV3PriceTrigger);

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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&baseToken',
        '$2',
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
    compV3RepayOnPriceStrategy.addAction(compV3WithdrawAction);
    compV3RepayOnPriceStrategy.addAction(sellAction);
    compV3RepayOnPriceStrategy.addAction(feeTakingAction);
    compV3RepayOnPriceStrategy.addAction(compV3PaybackAction);
    compV3RepayOnPriceStrategy.addAction(compV3RatioCheckAction);

    return compV3RepayOnPriceStrategy.encodeForDsProxyCall();
};
const createCompV3FLRepayOnPriceStrategy = () => {
    const compV3FLRepayOnPriceStrategy = new dfs.Strategy('CompV3FLRepayOnPriceStrategy');
    compV3FLRepayOnPriceStrategy.addSubSlot('&market', 'address');
    compV3FLRepayOnPriceStrategy.addSubSlot('&collToken', 'address');
    compV3FLRepayOnPriceStrategy.addSubSlot('&baseToken', 'address');
    compV3FLRepayOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    compV3FLRepayOnPriceStrategy.addSubSlot('&ratioState', 'uint8');
    compV3FLRepayOnPriceStrategy.addSubSlot('&user', 'address');

    const compV3PriceTrigger = new dfs.triggers.CompV3PriceTrigger(
        nullAddress,
        nullAddress,
        nullAddress,
        0,
        0,
    );
    compV3FLRepayOnPriceStrategy.addTrigger(compV3PriceTrigger);

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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&baseToken',
        '$2',
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
    compV3FLRepayOnPriceStrategy.addAction(flAction);
    compV3FLRepayOnPriceStrategy.addAction(sellAction);
    compV3FLRepayOnPriceStrategy.addAction(feeTakingAction);
    compV3FLRepayOnPriceStrategy.addAction(compV3PaybackAction);
    compV3FLRepayOnPriceStrategy.addAction(compV3WithdrawAction);
    compV3FLRepayOnPriceStrategy.addAction(compV3RatioCheckAction);

    return compV3FLRepayOnPriceStrategy.encodeForDsProxyCall();
};

const createCompV3FLCloseToDebtStrategy = () => {
    const compV3FLCloseToDebtStrategy = new dfs.Strategy('CompV3FLCloseToDebtStrategy');
    compV3FLCloseToDebtStrategy.addSubSlot('&market', 'address');
    compV3FLCloseToDebtStrategy.addSubSlot('&collToken', 'address');
    compV3FLCloseToDebtStrategy.addSubSlot('&baseToken', 'address');
    compV3FLCloseToDebtStrategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8'); // only used by backend to determine which action to call
    compV3FLCloseToDebtStrategy.addSubSlot('&user', 'address');

    const compV3ClosePriceRangeTrigger = new dfs.triggers.CompV3PriceRangeTrigger(
        nullAddress,
        nullAddress,
        0,
        0,
    );
    compV3FLCloseToDebtStrategy.addTrigger(compV3ClosePriceRangeTrigger);

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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&baseToken',
        '$4',
    );
    // return:
    // 1. Send baseToken flashloan amount to flAddress
    // 2. Send all baseToken's left after the close and flRepayment to eoa
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        ['&baseToken', '&baseToken'],
        [
            '%flAddress', // sent by backend
            '&eoa',
        ],
        [
            '$1',
            '%max(uint)', // sent by backend
        ],
    );

    compV3FLCloseToDebtStrategy.addAction(flAction);
    compV3FLCloseToDebtStrategy.addAction(paybackAction);
    compV3FLCloseToDebtStrategy.addAction(withdrawAction);
    compV3FLCloseToDebtStrategy.addAction(sellAction);
    compV3FLCloseToDebtStrategy.addAction(feeTakingAction);
    compV3FLCloseToDebtStrategy.addAction(sendTokensAction);

    return compV3FLCloseToDebtStrategy.encodeForDsProxyCall();
};
const createCompV3FLCloseToCollStrategy = () => {
    const compV3FLCloseToCollStrategy = new dfs.Strategy('CompV3FLCloseToCollStrategy');
    compV3FLCloseToCollStrategy.addSubSlot('&market', 'address');
    compV3FLCloseToCollStrategy.addSubSlot('&collToken', 'address');
    compV3FLCloseToCollStrategy.addSubSlot('&baseToken', 'address');
    compV3FLCloseToCollStrategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8'); // only used by backend to determine which action to call
    compV3FLCloseToCollStrategy.addSubSlot('&user', 'address');

    const compV3ClosePriceRangeTrigger = new dfs.triggers.CompV3PriceRangeTrigger(
        nullAddress,
        nullAddress,
        0,
        0,
    );
    compV3FLCloseToCollStrategy.addTrigger(compV3ClosePriceRangeTrigger);

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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collToken',
        '$4',
    );
    // return:
    // 1. Send collToken flashloan amount to flAddress
    // 2. Send all collToken's left after the close and flRepayment to eoa
    // 3. Send all baseToken's left after the close and flRepayment to eoa
    const sendTokensAction = new dfs.actions.basic.SendTokensAction(
        ['&collToken', '&collToken', '&baseToken'],
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

    compV3FLCloseToCollStrategy.addAction(flAction);
    compV3FLCloseToCollStrategy.addAction(sellAction);
    compV3FLCloseToCollStrategy.addAction(paybackAction);
    compV3FLCloseToCollStrategy.addAction(withdrawAction);
    compV3FLCloseToCollStrategy.addAction(feeTakingAction);
    compV3FLCloseToCollStrategy.addAction(sendTokensAction);

    return compV3FLCloseToCollStrategy.encodeForDsProxyCall();
};

const createAaveV3GenericBoostStrategy = () => {
    const aaveV3GenericBoostStrategy = new dfs.Strategy('AaveV3GenericBoostStrategy');

    aaveV3GenericBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3GenericBoostStrategy.addSubSlot('&checkBoostState', 'uint8');
    aaveV3GenericBoostStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3GenericBoostStrategy.addSubSlot('&user', 'address');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3GenericBoostStrategy.addTrigger(aaveV3Trigger);

    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '%amount', // must stay variable
        '&proxy', // hardcoded
        '%rateMode', // always 2 (variable)
        '%assetId', // must stay variable can choose diff. asset
        '%useOnBehalf', // hardcoded to true
        '&user', // EOA/SW addr from subData
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$3', // amount hardcoded - output of feeTakingAction
        '&proxy', // proxy hardcoded
        '%collAddr', // is variable as it can change
        '%assetId', // must be variable
        '%enableAsColl', // backend hardcoded always enable as coll
        '%useOnBehalf', // hardcoded to true
        '&user', // EOA/SW addr from subData
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkBoostState',
        '&targetRatio',
        '&marketAddr',
        '&user',
    );

    aaveV3GenericBoostStrategy.addAction(borrowAction);
    aaveV3GenericBoostStrategy.addAction(sellAction);
    aaveV3GenericBoostStrategy.addAction(feeTakingAction);
    aaveV3GenericBoostStrategy.addAction(supplyAction);
    aaveV3GenericBoostStrategy.addAction(checkerAction);

    return aaveV3GenericBoostStrategy.encodeForDsProxyCall();
};

const createAaveV3GenericFLBoostStrategy = () => {
    const aaveV3GenericFLBoostStrategy = new dfs.Strategy('AaveV3GenericFLBoostStrategy');

    aaveV3GenericFLBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3GenericFLBoostStrategy.addSubSlot('&checkBoostState', 'uint8');
    aaveV3GenericFLBoostStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3GenericFLBoostStrategy.addSubSlot('&user', 'address');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3GenericFLBoostStrategy.addTrigger(aaveV3Trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%debtAsset'], // sent by backend
            ['%flAmount'], // sent by backend
            nullAddress,
            [],
        ),
    );

    aaveV3GenericFLBoostStrategy.addAction(flAction);

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%collAddr', // must stay variable as coll can differ
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%collAddr', // is variable as it can change
        '%assetId', // must be variable
        '%enableAsColl', // backend hardcoded always enable as coll
        '%useOnBehalf', // hardcoded true use on behalf
        '&user', // EOA/SW addr from subData
    );

    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$1', // from Fl amount
        '%flAddr', // fl address that can change
        '%rateMode', // hardcoded 2 (VARIABLE)
        '%assetId', // must stay variable can choose diff. asset
        '%useOnBehalf', // set to true hardcoded
        '&user', // EOA/SW addr from subData
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkBoostState',
        '&targetRatio',
        '&marketAddr',
        '&user',
    );

    aaveV3GenericFLBoostStrategy.addAction(sellAction);
    aaveV3GenericFLBoostStrategy.addAction(feeTakingAction);
    aaveV3GenericFLBoostStrategy.addAction(supplyAction);
    aaveV3GenericFLBoostStrategy.addAction(borrowAction);
    aaveV3GenericFLBoostStrategy.addAction(checkerAction);

    return aaveV3GenericFLBoostStrategy.encodeForDsProxyCall();
};

const createAaveV3GenericRepayStrategy = () => {
    const aaveV3GenericRepayStrategy = new dfs.Strategy('AaveV3GenericRepayStrategy');

    aaveV3GenericRepayStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3GenericRepayStrategy.addSubSlot('&checkRepayState', 'uint8');
    aaveV3GenericRepayStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3GenericRepayStrategy.addSubSlot('&user', 'address');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3GenericRepayStrategy.addTrigger(aaveV3Trigger);

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        '%aCollTokenAddr', // aToken for collateral
        '&user', // hardcoded from subData
        '%amount', // must stay variable
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$1', // output of pullTokenAction
        '&proxy', // hardcoded
        '%assetId', // must stay variable can choose diff. asset
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '%debtAddr', // must stay variable
            '$2', //  hardcoded piped from withdraw action
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as debt can differ
        '$3', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$4', // amount hardcoded - output of feeTakingAction
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt - 2
        '%debtAddr', // used just for sdk not actually sent
        '%assetId', // must be variable
        '%useOnBehalf', // hardcoded true
        '&user', // EOA/SW from subData
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkRepayState',
        '&targetRatio',
        '&marketAddr',
        '&user',
    );

    aaveV3GenericRepayStrategy.addAction(pullTokenAction);
    aaveV3GenericRepayStrategy.addAction(withdrawAction);
    aaveV3GenericRepayStrategy.addAction(sellAction);
    aaveV3GenericRepayStrategy.addAction(feeTakingAction);
    aaveV3GenericRepayStrategy.addAction(paybackAction);
    aaveV3GenericRepayStrategy.addAction(checkerAction);

    return aaveV3GenericRepayStrategy.encodeForDsProxyCall();
};

const createAaveV3GenericFLRepayStrategy = () => {
    const aaveV3GenericFLRepayStrategy = new dfs.Strategy('AaveV3GenericFLRepayStrategy');

    aaveV3GenericFLRepayStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3GenericFLRepayStrategy.addSubSlot('&checkRepayState', 'uint8');
    aaveV3GenericFLRepayStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3GenericFLRepayStrategy.addSubSlot('&user', 'address');

    const aaveV3Trigger = new dfs.triggers.AaveV3RatioTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3GenericFLRepayStrategy.addTrigger(aaveV3Trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collAsset'], // sent by backend
            ['%flAmount'], // sent by backend
            nullAddress,
            [],
        ),
    );

    aaveV3GenericFLRepayStrategy.addAction(flAction);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%collAddr', // must stay variable
            '%debtAddr', // must stay variable
            '%amount', //  can't hard code because of potential FL fee
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', // must stay variable backend sets gasCost
        '%debtAddr', // must stay variable as debt can differ
        '$2', // hardcoded output from sell
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '%debtAddr', // used just for sdk not actually sent
        '%assetId', // must be variable
        '%useOnBehalf', // hardcoded true
        '&user', // EOA/SW addr from subData
    );

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        '%aCollTokenAddr', // aToken for collateral
        '&user', // EOA/SW addr from subData
        '$1', // output of FL action
    );

    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$5', // repay fl amount
        '%flAddr', // flAddr not hardcoded (tx will fail if not returned to correct addr)
        '%assetId', // must stay variable can choose diff. asset
    );

    const checkerAction = new dfs.actions.checkers.AaveV3RatioCheckAction(
        '&checkRepayState',
        '&targetRatio',
        '&marketAddr',
        '&user',
    );

    aaveV3GenericFLRepayStrategy.addAction(sellAction);
    aaveV3GenericFLRepayStrategy.addAction(feeTakingAction);
    aaveV3GenericFLRepayStrategy.addAction(paybackAction);
    aaveV3GenericFLRepayStrategy.addAction(pullTokenAction);
    aaveV3GenericFLRepayStrategy.addAction(withdrawAction);
    aaveV3GenericFLRepayStrategy.addAction(checkerAction);

    return aaveV3GenericFLRepayStrategy.encodeForDsProxyCall();
};

const createAaveV3GenericBoostOnPriceStrategy = () => {
    const aaveV3GenericBoostOnPriceStrategy = new dfs.Strategy('AaveV3GenericBoostOnPriceStrategy');

    aaveV3GenericBoostOnPriceStrategy.addSubSlot('&collAsset', 'address');
    aaveV3GenericBoostOnPriceStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3GenericBoostOnPriceStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3GenericBoostOnPriceStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3GenericBoostOnPriceStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3GenericBoostOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3GenericBoostOnPriceStrategy.addSubSlot('&user', 'address');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3GenericBoostOnPriceStrategy.addTrigger(trigger);

    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '%amount', // amount to borrow, must stay variable, sent from backend
        '&proxy',
        '%rateMode', // hardcode to VARIABLE = 2
        '&debtAssetId',
        '%useOnBehalf', // hardcoded to true
        '&user', // EOA/SW addr hardcoded from subData
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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collAsset',
        '$2', // output of sell action
    );
    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$3', // output of gas fee taker action
        '&proxy',
        '&collAsset',
        '&collAssetId',
        '%enableAsColl', // hardcode to true
        '%useOnBehalf', // hardcoded to true
        '&user', // EOA/SW addr hardcoded from subData
    );
    const openRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr', // from subData
        '&user',
    );
    aaveV3GenericBoostOnPriceStrategy.addAction(borrowAction);
    aaveV3GenericBoostOnPriceStrategy.addAction(sellAction);
    aaveV3GenericBoostOnPriceStrategy.addAction(feeTakingAction);
    aaveV3GenericBoostOnPriceStrategy.addAction(supplyAction);
    aaveV3GenericBoostOnPriceStrategy.addAction(openRatioCheckAction);
    return aaveV3GenericBoostOnPriceStrategy.encodeForDsProxyCall();
};

const createAaveV3GenericFLBoostOnPriceStrategy = () => {
    const aaveV3GenericFLBoostOnPriceStrategy = new dfs.Strategy(
        'AaveV3GenericFLBoostOnPriceStrategy',
    );

    aaveV3GenericFLBoostOnPriceStrategy.addSubSlot('&collAsset', 'address');
    aaveV3GenericFLBoostOnPriceStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3GenericFLBoostOnPriceStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3GenericFLBoostOnPriceStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3GenericFLBoostOnPriceStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3GenericFLBoostOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3GenericFLBoostOnPriceStrategy.addSubSlot('&user', 'address');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3GenericFLBoostOnPriceStrategy.addTrigger(trigger);

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
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collAsset',
        '$2', // output of sell action
    );
    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$3', // output of gas fee taker action
        '&proxy',
        '&collAsset',
        '&collAssetId',
        '%enableAsColl', // hardcode to true
        '%useOnBehalf', // hardcoded to true
        '&user', // EOA/SW addr hardcoded from subData
    );
    const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$1',
        '%flAddress', // fl address, sent by backend
        '%rateMode', // hardcode to VARIABLE = 2
        '&debtAssetId',
        '%useOnBehalf', // hardcoded to true
        '&user', // EOA/SW addr hardcoded from subData
    );
    const openRatioCheckAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
        '&user',
    );
    aaveV3GenericFLBoostOnPriceStrategy.addAction(flAction);
    aaveV3GenericFLBoostOnPriceStrategy.addAction(sellAction);
    aaveV3GenericFLBoostOnPriceStrategy.addAction(feeTakingAction);
    aaveV3GenericFLBoostOnPriceStrategy.addAction(supplyAction);
    aaveV3GenericFLBoostOnPriceStrategy.addAction(borrowAction);
    aaveV3GenericFLBoostOnPriceStrategy.addAction(openRatioCheckAction);
    return aaveV3GenericFLBoostOnPriceStrategy.encodeForDsProxyCall();
};

const createAaveV3GenericRepayOnPriceStrategy = () => {
    const aaveV3GenericRepayOnPriceStrategy = new dfs.Strategy('AaveV3GenericRepayOnPriceStrategy');

    aaveV3GenericRepayOnPriceStrategy.addSubSlot('&collAsset', 'address');
    aaveV3GenericRepayOnPriceStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3GenericRepayOnPriceStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3GenericRepayOnPriceStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3GenericRepayOnPriceStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3GenericRepayOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3GenericRepayOnPriceStrategy.addSubSlot('&user', 'address');

    const aaveV3Trigger = new dfs.triggers.AaveV3QuotePriceTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
    aaveV3GenericRepayOnPriceStrategy.addTrigger(aaveV3Trigger);

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        '%aCollTokenAddr', // aToken for collateral
        '&user', // hardcoded from subData
        '%amount', // must stay variable
    );
    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$1', // output of pullTokenAction
        '&proxy', // hardcoded
        '&collAssetId',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset',
            '$2', //  hardcoded piped from withdraw
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // must stay variable backend sets gasCost
        '&debtAsset',
        '$3', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$4', // amount hardcoded piped from fee taking
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '&debtAsset',
        '&debtAssetId',
        '%useOnBehalf', // hardcoded true
        '&user', // EOA/SW addr hardcoded from subData
    );

    const checkerAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
        '&user',
    );

    aaveV3GenericRepayOnPriceStrategy.addAction(pullTokenAction);
    aaveV3GenericRepayOnPriceStrategy.addAction(withdrawAction);
    aaveV3GenericRepayOnPriceStrategy.addAction(sellAction);
    aaveV3GenericRepayOnPriceStrategy.addAction(feeTakingAction);
    aaveV3GenericRepayOnPriceStrategy.addAction(paybackAction);
    aaveV3GenericRepayOnPriceStrategy.addAction(checkerAction);

    return aaveV3GenericRepayOnPriceStrategy.encodeForDsProxyCall();
};

const createAaveV3GenericFLRepayOnPriceStrategy = () => {
    const aaveV3GenericFLRepayOnPriceStrategy = new dfs.Strategy(
        'AaveV3GenericFLRepayOnPriceStrategy',
    );

    aaveV3GenericFLRepayOnPriceStrategy.addSubSlot('&collAsset', 'address');
    aaveV3GenericFLRepayOnPriceStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3GenericFLRepayOnPriceStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3GenericFLRepayOnPriceStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3GenericFLRepayOnPriceStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3GenericFLRepayOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');
    aaveV3GenericFLRepayOnPriceStrategy.addSubSlot('&user', 'address');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3GenericFLRepayOnPriceStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collAsset'], // sent by backend
            ['%flAmount'], // sent by backend
            nullAddress,
            [],
        ),
    );

    aaveV3GenericFLRepayOnPriceStrategy.addAction(flAction);

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // must stay variable backend sets gasCost
        '&debtAsset',
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$3', // amount hardcoded output from fee taking
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '&debtAsset',
        '&debtAssetId',
        '%useOnBehalf', // hardcoded true
        '&user', // EOA/SW addr hardcoded from subData
    );

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        '%aCollTokenAddr', // aToken for collateral
        '&user', // hardcoded from subData
        '$1', // output of FL action
    );
    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr',
        '$5', // repay fl amount
        '%flAddr', // flAddr not hardcoded (tx will fail if not returned to correct addr)
        '&collAssetId',
    );

    const checkerAction = new dfs.actions.checkers.AaveV3OpenRatioCheckAction(
        '&targetRatio',
        '&marketAddr',
        '&user',
    );

    aaveV3GenericFLRepayOnPriceStrategy.addAction(sellAction);
    aaveV3GenericFLRepayOnPriceStrategy.addAction(feeTakingAction);
    aaveV3GenericFLRepayOnPriceStrategy.addAction(paybackAction);
    aaveV3GenericFLRepayOnPriceStrategy.addAction(pullTokenAction);
    aaveV3GenericFLRepayOnPriceStrategy.addAction(withdrawAction);
    aaveV3GenericFLRepayOnPriceStrategy.addAction(checkerAction);

    return aaveV3GenericFLRepayOnPriceStrategy.encodeForDsProxyCall();
};

const createAaveV3GenericFLCloseToCollStrategy = () => {
    const aaveV3GenericFLCloseToCollStrategy = new dfs.Strategy(
        'AaveV3GenericFLCloseToCollStrategy',
    );

    aaveV3GenericFLCloseToCollStrategy.addSubSlot('&collAsset', 'address');
    aaveV3GenericFLCloseToCollStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3GenericFLCloseToCollStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3GenericFLCloseToCollStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3GenericFLCloseToCollStrategy.addSubSlot(
        '&automationSdk.enums.CloseStrategyType',
        'uint8',
    ); // only used by backend to determine which action to call
    aaveV3GenericFLCloseToCollStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3GenericFLCloseToCollStrategy.addSubSlot('&user', 'address');

    const trigger = new dfs.triggers.AaveV3QuotePriceRangeTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
    aaveV3GenericFLCloseToCollStrategy.addTrigger(trigger);

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
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '%uint(max)', // backend sends max uint
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '&debtAsset',
        '&debtAssetId',
        '%useOnBehalf', // hardcoded true
        '&user', // EOA/SW addr hardcoded from subData
    );

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        '%aCollTokenAddr', // aToken for collateral
        '&user', // hardcoded from subData
        '%uint(max)', // backend sends max uint
    );
    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$4', // output of pullTokenAction
        '&proxy', // proxy hardcoded
        '&collAssetId',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collAsset',
        '$5',
    );

    // return flashloan. This has to be separate action, because we don't want to unwrap weth
    const sendTokenToFLAction = new dfs.actions.basic.SendTokenAction(
        '&collAsset',
        '%flAddress', // sent by backend
        '$1',
    );

    // return:
    // 1. Send all collAsset's left after the close and flRepayment to eoa
    // 2. Send all debtAsset's left after the close and flRepayment to eoa
    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        ['&collAsset', '&debtAsset'],
        [
            '&eoa', // EOA
            '&eoa', // EOA
        ],
        [
            '%max(uint)', // sent by backend
            '%max(uint)', // sent by backend
        ],
    );

    aaveV3GenericFLCloseToCollStrategy.addAction(flAction);
    aaveV3GenericFLCloseToCollStrategy.addAction(sellAction);
    aaveV3GenericFLCloseToCollStrategy.addAction(paybackAction);
    aaveV3GenericFLCloseToCollStrategy.addAction(pullTokenAction);
    aaveV3GenericFLCloseToCollStrategy.addAction(withdrawAction);
    aaveV3GenericFLCloseToCollStrategy.addAction(feeTakingAction);
    aaveV3GenericFLCloseToCollStrategy.addAction(sendTokenToFLAction);
    aaveV3GenericFLCloseToCollStrategy.addAction(sendTokensAction);

    return aaveV3GenericFLCloseToCollStrategy.encodeForDsProxyCall();
};

const createAaveV3GenericFLCloseToDebtStrategy = () => {
    const aaveV3GenericFLCloseToDebtStrategy = new dfs.Strategy(
        'AaveV3GenericFLCloseToDebtStrategy',
    );

    aaveV3GenericFLCloseToDebtStrategy.addSubSlot('&collAsset', 'address');
    aaveV3GenericFLCloseToDebtStrategy.addSubSlot('&collAssetId', 'uint16');
    aaveV3GenericFLCloseToDebtStrategy.addSubSlot('&debtAsset', 'address');
    aaveV3GenericFLCloseToDebtStrategy.addSubSlot('&debtAssetId', 'uint16');
    aaveV3GenericFLCloseToDebtStrategy.addSubSlot(
        '&automationSdk.enums.CloseStrategyType',
        'uint8',
    ); // only used by backend to determine which action to call
    aaveV3GenericFLCloseToDebtStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3GenericFLCloseToDebtStrategy.addSubSlot('&user', 'address');

    const trigger = new dfs.triggers.AaveV3QuotePriceRangeTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
    aaveV3GenericFLCloseToDebtStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%debtAsset'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );

    const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '%uint(max)', // backend sends max uint
        '&proxy', // proxy hardcoded
        '%rateMode', // variable type of debt
        '&debtAsset',
        '&debtAssetId',
        '%useOnBehalf', // hardcoded true
        '&user', // EOA/SW addr hardcoded from subData
    );

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        '%aCollTokenAddr', // aToken for collateral
        '&user', // hardcoded from subData
        '%uint(max)', // backend sends max uint
    );
    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%useDefaultMarket', // hardcoded to false
        '&marketAddr', // from subData
        '$3', // output of pullTokenAction
        '&proxy', // proxy hardcoded
        '&collAssetId',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset',
            '$4', // output of withdrawAction
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy', // proxy hardcoded
        '&proxy', // proxy hardcoded
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&debtAsset',
        '$5',
    );

    // return flashloan. This has to be separate action, because we don't want to unwrap weth
    const sendTokenToFLAction = new dfs.actions.basic.SendTokenAction(
        '&debtAsset',
        '%flAddress', // sent by backend
        '$1',
    );

    const sendTokenToEOAAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
        '&debtAsset',
        '&eoa',
        '%max(uint)',
    );

    aaveV3GenericFLCloseToDebtStrategy.addAction(flAction);
    aaveV3GenericFLCloseToDebtStrategy.addAction(paybackAction);
    aaveV3GenericFLCloseToDebtStrategy.addAction(pullTokenAction);
    aaveV3GenericFLCloseToDebtStrategy.addAction(withdrawAction);
    aaveV3GenericFLCloseToDebtStrategy.addAction(sellAction);
    aaveV3GenericFLCloseToDebtStrategy.addAction(feeTakingAction);
    aaveV3GenericFLCloseToDebtStrategy.addAction(sendTokenToFLAction);
    aaveV3GenericFLCloseToDebtStrategy.addAction(sendTokenToEOAAction);

    return aaveV3GenericFLCloseToDebtStrategy.encodeForDsProxyCall();
};

const createAaveV3FLCollateralSwitchStrategy = () => {
    const aaveV3FLCollateralSwitchStrategy = new dfs.Strategy('AaveV3FLCollateralSwitchStrategy');

    aaveV3FLCollateralSwitchStrategy.addSubSlot('&fromAsset', 'address');
    aaveV3FLCollateralSwitchStrategy.addSubSlot('&fromAssetId', 'uint16');
    aaveV3FLCollateralSwitchStrategy.addSubSlot('&toAsset', 'address');
    aaveV3FLCollateralSwitchStrategy.addSubSlot('&toAssetId', 'uint16');
    aaveV3FLCollateralSwitchStrategy.addSubSlot('&marketAddr', 'address');
    aaveV3FLCollateralSwitchStrategy.addSubSlot('&amountToSwitch', 'uint256');
    aaveV3FLCollateralSwitchStrategy.addSubSlot('&useOnBehalf', 'bool');

    const trigger = new dfs.triggers.AaveV3QuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    aaveV3FLCollateralSwitchStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%fromAsset'], // Sent by backend.
            ['%flAmount'], // Sent by backend.
            // For maxUint256 amount use current fromAsset balance instead of '&amountToSwitch'.
            // The maximum we can withdraw later is '&amountToSwitch', so this fl amount should be lowered for any fl fees so that:
            // flAmount + flAmount * flFee = '&amountToSwitch'
            // flAmount = '&amountToSwitch' / (1 + flFee)
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&fromAsset',
            '&toAsset',
            '%flAmount', // Sent by backend
            '%exchangeWrapper', // Sent by backend.
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // Sent by backend.
        '&toAsset',
        '$2',
    );
    const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
        '%false', //  useDefaultMarket - Sent by backend.
        '&marketAddr',
        '$3',
        '&proxy',
        '&toAsset',
        '&toAssetId',
        '%true', // enableAsColl - Sent by backend
        '&useOnBehalf',
        '%address(0)', // onBehalf - Sent by backend
    );
    const withdrawAction = new dfs.actions.aaveV3.AaveV3WithdrawAction(
        '%false', // useDefaultMarket - Sent by backend
        '&marketAddr',
        '&amountToSwitch',
        '&proxy',
        '&fromAssetId',
    );
    const returnFLAction = new dfs.actions.basic.SendTokenAction(
        '&fromAsset',
        '%flAddress', // Sent by backend.
        '$1',
    );
    const returnAnyDust = new dfs.actions.basic.SendTokenAndUnwrapAction(
        '&fromAsset',
        '&eoa',
        '%max(uint)', // Sent by backend,
    );

    aaveV3FLCollateralSwitchStrategy.addAction(flAction);
    aaveV3FLCollateralSwitchStrategy.addAction(sellAction);
    aaveV3FLCollateralSwitchStrategy.addAction(feeTakingAction);
    aaveV3FLCollateralSwitchStrategy.addAction(supplyAction);
    aaveV3FLCollateralSwitchStrategy.addAction(withdrawAction);
    aaveV3FLCollateralSwitchStrategy.addAction(returnFLAction);
    aaveV3FLCollateralSwitchStrategy.addAction(returnAnyDust);

    return aaveV3FLCollateralSwitchStrategy.encodeForDsProxyCall();
};

const createSparkGenericFLCloseToCollStrategy = () => {
    const sparkGenericFLCloseToCollStrategy = new dfs.Strategy('SparkGenericFLCloseToCollStrategy');

    sparkGenericFLCloseToCollStrategy.addSubSlot('&collAsset', 'address');
    sparkGenericFLCloseToCollStrategy.addSubSlot('&collAssetId', 'uint16');
    sparkGenericFLCloseToCollStrategy.addSubSlot('&debtAsset', 'address');
    sparkGenericFLCloseToCollStrategy.addSubSlot('&debtAssetId', 'uint16');
    sparkGenericFLCloseToCollStrategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8'); // only used by backend to determine which action to call
    sparkGenericFLCloseToCollStrategy.addSubSlot('&marketAddr', 'address');
    sparkGenericFLCloseToCollStrategy.addSubSlot('&user', 'address');

    const trigger = new dfs.triggers.SparkQuotePriceRangeTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
    sparkGenericFLCloseToCollStrategy.addTrigger(trigger);

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
        '&proxy',
        '&proxy',
    );
    const paybackAction = new dfs.actions.spark.SparkPaybackAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '%uint(max)', // max uint amount - Sent by backend.
        '&proxy',
        '%variableRate=2', // variable type of debt, hardcoded to 2 - Sent by backend.
        '&debtAsset',
        '&debtAssetId',
        '%true', // useOnBehalf, hardcoded to true - Sent by backend.
        '&user',
    );
    /// @dev This action won't have any effect for proxy positions, as aTokens will already be on proxy
    /// However, it is generalized, so it can support EOA positions as well.
    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        '%aCollTokenAddr', // aToken for collateral - Sent by backend.
        '&user',
        '%uint(max)', // max uint amount - Sent by backend.
    );
    const withdrawAction = new dfs.actions.spark.SparkWithdrawAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '$4',
        '&proxy',
        '&collAssetId',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collAsset',
        '$5',
    );
    // return flashloan. This has to be separate action, because we don't want to unwrap weth
    const sendTokenToFLAction = new dfs.actions.basic.SendTokenAction(
        '&collAsset',
        '%flAddress', // sent by backend
        '$1',
    );
    // return:
    // 1. Send all collAsset's left after the close and flRepayment to eoa
    // 2. Send all debtAsset's left after the close and flRepayment to eoa
    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        ['&collAsset', '&debtAsset'],
        ['&eoa', '&eoa'],
        [
            '%max(uint)', // sent by backend
            '%max(uint)', // sent by backend
        ],
    );

    sparkGenericFLCloseToCollStrategy.addAction(flAction);
    sparkGenericFLCloseToCollStrategy.addAction(sellAction);
    sparkGenericFLCloseToCollStrategy.addAction(paybackAction);
    sparkGenericFLCloseToCollStrategy.addAction(pullTokenAction);
    sparkGenericFLCloseToCollStrategy.addAction(withdrawAction);
    sparkGenericFLCloseToCollStrategy.addAction(feeTakingAction);
    sparkGenericFLCloseToCollStrategy.addAction(sendTokenToFLAction);
    sparkGenericFLCloseToCollStrategy.addAction(sendTokensAction);

    return sparkGenericFLCloseToCollStrategy.encodeForDsProxyCall();
};

const createSparkGenericFLCloseToDebtStrategy = () => {
    const sparkGenericFLCloseToDebtStrategy = new dfs.Strategy('SparkGenericFLCloseToDebtStrategy');

    sparkGenericFLCloseToDebtStrategy.addSubSlot('&collAsset', 'address');
    sparkGenericFLCloseToDebtStrategy.addSubSlot('&collAssetId', 'uint16');
    sparkGenericFLCloseToDebtStrategy.addSubSlot('&debtAsset', 'address');
    sparkGenericFLCloseToDebtStrategy.addSubSlot('&debtAssetId', 'uint16');
    sparkGenericFLCloseToDebtStrategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8'); // only used by backend to determine which action to call
    sparkGenericFLCloseToDebtStrategy.addSubSlot('&marketAddr', 'address');
    sparkGenericFLCloseToDebtStrategy.addSubSlot('&user', 'address');

    const trigger = new dfs.triggers.SparkQuotePriceRangeTrigger(
        nullAddress,
        nullAddress,
        '0',
        '0',
    );
    sparkGenericFLCloseToDebtStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%debtAsset'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );

    const paybackAction = new dfs.actions.spark.SparkPaybackAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '%uint(max)', // max uint amount - Sent by backend.
        '&proxy',
        '%variableRate=2', // variable type of debt, hardcoded to 2 - Sent by backend.
        '&debtAsset',
        '&debtAssetId',
        '%true', // useOnBehalf, hardcoded to true - Sent by backend.
        '&user',
    );
    /// @dev This action won't have any effect for proxy positions, as aTokens will already be on proxy
    /// However, it is generalized, so it can support EOA positions as well.
    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        '%aCollTokenAddr', // aToken for collateral - Sent by backend.
        '&user',
        '%uint(max)', // max uint amount - Sent by backend.
    );
    const withdrawAction = new dfs.actions.spark.SparkWithdrawAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '$3',
        '&proxy',
        '&collAssetId',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset',
            '$4',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&debtAsset',
        '$5',
    );

    // return flashloan. This has to be separate action, because we don't want to unwrap weth
    const sendTokenToFLAction = new dfs.actions.basic.SendTokenAction(
        '&debtAsset',
        '%flAddress', // sent by backend
        '$1',
    );

    const sendTokenToEOAAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
        '&debtAsset',
        '&eoa',
        '%max(uint)', // sent by backend
    );

    sparkGenericFLCloseToDebtStrategy.addAction(flAction);
    sparkGenericFLCloseToDebtStrategy.addAction(paybackAction);
    sparkGenericFLCloseToDebtStrategy.addAction(pullTokenAction);
    sparkGenericFLCloseToDebtStrategy.addAction(withdrawAction);
    sparkGenericFLCloseToDebtStrategy.addAction(sellAction);
    sparkGenericFLCloseToDebtStrategy.addAction(feeTakingAction);
    sparkGenericFLCloseToDebtStrategy.addAction(sendTokenToFLAction);
    sparkGenericFLCloseToDebtStrategy.addAction(sendTokenToEOAAction);

    return sparkGenericFLCloseToDebtStrategy.encodeForDsProxyCall();
};

const createMorphoBlueFLCloseToCollStrategy = () => {
    const morphoBlueFLCloseToCollStrategy = new dfs.Strategy('MorphoBlueFLCloseToCollStrategy');

    morphoBlueFLCloseToCollStrategy.addSubSlot('&loanToken', 'address');
    morphoBlueFLCloseToCollStrategy.addSubSlot('&collateralToken', 'address');
    morphoBlueFLCloseToCollStrategy.addSubSlot('&oracle', 'address');
    morphoBlueFLCloseToCollStrategy.addSubSlot('&irm', 'address');
    morphoBlueFLCloseToCollStrategy.addSubSlot('&lltv', 'uint256');
    morphoBlueFLCloseToCollStrategy.addSubSlot('&user', 'address');
    morphoBlueFLCloseToCollStrategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8'); // only used by backend to determine which action to call

    const trigger = new dfs.triggers.MorphoBluePriceRangeTrigger(
        'loanToken',
        'collateralToken',
        'oracle',
        'lowerPrice',
        'upperPrice',
    );
    morphoBlueFLCloseToCollStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%collateralToken'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collateralToken',
            '&loanToken',
            '%flAmount', // sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const morphoPayback = new dfs.actions.morphoblue.MorphoBluePaybackAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '%uint(max)', // max uint amount - Sent by backend.
        '&proxy',
        '&user',
    );
    const morphoWithdrawCollateral = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '%userCollateralAmount', // Read current user collateral amount - Sent by backend. Note: Does not support max uint amount. Collateral is IDLE, so no dust possible.
        '&user',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&collateralToken',
        '$4',
    );
    const sendTokenToFlAction = new dfs.actions.basic.SendTokenAction(
        '&collateralToken',
        '%flAddress', // sent by backend
        '$1',
    );
    // return:
    // 1. Send all collateralToken's left after the close and flRepayment to eoa
    // 2. Send all loanToken's left after the close and flRepayment to eoa
    const sendTokensAction = new dfs.actions.basic.SendTokensAndUnwrapAction(
        ['&collateralToken', '&loanToken'],
        ['&eoa', '&eoa'],
        [
            '%max(uint)', // sent by backend
            '%max(uint)', // sent by backend
        ],
    );
    morphoBlueFLCloseToCollStrategy.addAction(flAction);
    morphoBlueFLCloseToCollStrategy.addAction(sellAction);
    morphoBlueFLCloseToCollStrategy.addAction(morphoPayback);
    morphoBlueFLCloseToCollStrategy.addAction(morphoWithdrawCollateral);
    morphoBlueFLCloseToCollStrategy.addAction(feeTakingAction);
    morphoBlueFLCloseToCollStrategy.addAction(sendTokenToFlAction);
    morphoBlueFLCloseToCollStrategy.addAction(sendTokensAction);

    return morphoBlueFLCloseToCollStrategy.encodeForDsProxyCall();
};

const createMorphoBlueFLCloseToDebtStrategy = () => {
    const morphoBlueFLCloseToDebtStrategy = new dfs.Strategy('MorphoBlueFLCloseToDebtStrategy');

    morphoBlueFLCloseToDebtStrategy.addSubSlot('&loanToken', 'address');
    morphoBlueFLCloseToDebtStrategy.addSubSlot('&collateralToken', 'address');
    morphoBlueFLCloseToDebtStrategy.addSubSlot('&oracle', 'address');
    morphoBlueFLCloseToDebtStrategy.addSubSlot('&irm', 'address');
    morphoBlueFLCloseToDebtStrategy.addSubSlot('&lltv', 'uint256');
    morphoBlueFLCloseToDebtStrategy.addSubSlot('&user', 'address');
    morphoBlueFLCloseToDebtStrategy.addSubSlot('&automationSdk.enums.CloseStrategyType', 'uint8'); // only used by backend to determine which action to call

    const trigger = new dfs.triggers.MorphoBluePriceRangeTrigger(
        'loanToken',
        'collateralToken',
        'oracle',
        'lowerPrice',
        'upperPrice',
    );
    morphoBlueFLCloseToDebtStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%loanToken'], // sent by backend
            ['%flAmount'], // sent by backend
        ),
    );
    const morphoPayback = new dfs.actions.morphoblue.MorphoBluePaybackAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '%uint(max)', // max uint amount - Sent by backend.
        '&proxy',
        '&user',
    );
    const morphoWithdrawCollateral = new dfs.actions.morphoblue.MorphoBlueWithdrawCollateralAction(
        '&loanToken',
        '&collateralToken',
        '&oracle',
        '&irm',
        '&lltv',
        '%userCollateralAmount', // Read current user collateral amount - Sent by backend. Note: Does not support max uint amount. Collateral is IDLE, so no dust possible.
        '&user',
        '&proxy',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collateralToken',
            '&loanToken',
            '$3',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%gasStart', // sent by backend
        '&loanToken',
        '$4',
    );
    const sendTokenToFlAction = new dfs.actions.basic.SendTokenAction(
        '&loanToken',
        '%flAddress', // sent by backend
        '$1',
    );
    const sendTokenToEoaAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
        '&loanToken',
        '&eoa',
        '%max(uint)', // sent by backend
    );
    morphoBlueFLCloseToDebtStrategy.addAction(flAction);
    morphoBlueFLCloseToDebtStrategy.addAction(morphoPayback);
    morphoBlueFLCloseToDebtStrategy.addAction(morphoWithdrawCollateral);
    morphoBlueFLCloseToDebtStrategy.addAction(sellAction);
    morphoBlueFLCloseToDebtStrategy.addAction(feeTakingAction);
    morphoBlueFLCloseToDebtStrategy.addAction(sendTokenToFlAction);
    morphoBlueFLCloseToDebtStrategy.addAction(sendTokenToEoaAction);

    return morphoBlueFLCloseToDebtStrategy.encodeForDsProxyCall();
};

const createSparkRepayOnPriceStrategy = () => {
    const sparkRepayOnPriceStrategy = new dfs.Strategy('SparkRepayOnPriceStrategy');

    sparkRepayOnPriceStrategy.addSubSlot('&collAsset', 'address');
    sparkRepayOnPriceStrategy.addSubSlot('&collAssetId', 'uint16');
    sparkRepayOnPriceStrategy.addSubSlot('&debtAsset', 'address');
    sparkRepayOnPriceStrategy.addSubSlot('&debtAssetId', 'uint16');
    sparkRepayOnPriceStrategy.addSubSlot('&marketAddr', 'address');
    sparkRepayOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');

    const trigger = new dfs.triggers.SparkQuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    sparkRepayOnPriceStrategy.addTrigger(trigger);

    const withdrawAction = new dfs.actions.spark.SparkWithdrawAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '%amount', // amount to withdraw - Sent by backend.
        '&proxy',
        '&collAssetId',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset',
            '$1',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%gasStart', '&debtAsset', '$2');

    const paybackAction = new dfs.actions.spark.SparkPaybackAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '$3',
        '&proxy',
        '%rateMode', // variable type of debt, sent by backend
        '&debtAsset',
        '&debtAssetId',
        '%false', // useOnBehalf, set to false - Sent by backend.
        '%onBehalfAddr', // set to empty because flag is false
    );

    const checkerAction = new dfs.actions.checkers.SparkTargetRatioCheck(
        '&targetRatio',
        '&marketAddr',
    );

    sparkRepayOnPriceStrategy.addAction(withdrawAction);
    sparkRepayOnPriceStrategy.addAction(sellAction);
    sparkRepayOnPriceStrategy.addAction(feeTakingAction);
    sparkRepayOnPriceStrategy.addAction(paybackAction);
    sparkRepayOnPriceStrategy.addAction(checkerAction);

    return sparkRepayOnPriceStrategy.encodeForDsProxyCall();
};

const createSparkFLRepayOnPriceStrategy = () => {
    const sparkFLRepayOnPriceStrategy = new dfs.Strategy('SparkFLRepayOnPriceStrategy');

    sparkFLRepayOnPriceStrategy.addSubSlot('&collAsset', 'address');
    sparkFLRepayOnPriceStrategy.addSubSlot('&collAssetId', 'uint16');
    sparkFLRepayOnPriceStrategy.addSubSlot('&debtAsset', 'address');
    sparkFLRepayOnPriceStrategy.addSubSlot('&debtAssetId', 'uint16');
    sparkFLRepayOnPriceStrategy.addSubSlot('&marketAddr', 'address');
    sparkFLRepayOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');

    const trigger = new dfs.triggers.SparkQuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    sparkFLRepayOnPriceStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.SparkFlashLoanAction(
            ['%collAsset'], // sent by backend
            ['%flAmount'], // sent by backend
            nullAddress,
            [],
        ),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&collAsset',
            '&debtAsset',
            '%amount',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%gasStart', '&debtAsset', '$2');

    const paybackAction = new dfs.actions.spark.SparkPaybackAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '$3',
        '&proxy',
        '%rateMode', // variable type of debt, sent by backend
        '&debtAsset',
        '&debtAssetId',
        '%false', // useOnBehalf, set to false - Sent by backend.
        '%onBehalfAddr', // set to empty because flag is false
    );

    const withdrawAction = new dfs.actions.spark.SparkWithdrawAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '$1',
        '%flAddress', // sent by backend
        '&collAssetId',
    );

    const checkerAction = new dfs.actions.checkers.SparkTargetRatioCheck(
        '&targetRatio',
        '&marketAddr',
    );

    sparkFLRepayOnPriceStrategy.addAction(flAction);
    sparkFLRepayOnPriceStrategy.addAction(sellAction);
    sparkFLRepayOnPriceStrategy.addAction(feeTakingAction);
    sparkFLRepayOnPriceStrategy.addAction(paybackAction);
    sparkFLRepayOnPriceStrategy.addAction(withdrawAction);
    sparkFLRepayOnPriceStrategy.addAction(checkerAction);

    return sparkFLRepayOnPriceStrategy.encodeForDsProxyCall();
};

const createSparkBoostOnPriceStrategy = () => {
    const sparkBoostOnPriceStrategy = new dfs.Strategy('SparkBoostOnPriceStrategy');

    sparkBoostOnPriceStrategy.addSubSlot('&collAsset', 'address');
    sparkBoostOnPriceStrategy.addSubSlot('&collAssetId', 'uint16');
    sparkBoostOnPriceStrategy.addSubSlot('&debtAsset', 'address');
    sparkBoostOnPriceStrategy.addSubSlot('&debtAssetId', 'uint16');
    sparkBoostOnPriceStrategy.addSubSlot('&marketAddr', 'address');
    sparkBoostOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');

    const trigger = new dfs.triggers.SparkQuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    sparkBoostOnPriceStrategy.addTrigger(trigger);

    const borrowAction = new dfs.actions.spark.SparkBorrowAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '%amount', // amount to borrow - Sent by backend.
        '&proxy',
        '%rateMode',
        '&debtAssetId',
        '%false', // useOnBehalf, set to false - Sent by backend.
        '%onBehalfAddr', // set to empty because flag is false
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&debtAsset',
            '&collAsset',
            '%amount',
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%gasStart', '&collAsset', '$2');

    const supplyAction = new dfs.actions.spark.SparkSupplyAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '$3',
        '&proxy',
        '&collAsset',
        '&collAssetId',
        '%enableAsColl', // hardcoded always enable as coll
        '%false', // useOnBehalf, set to false - Sent by backend.
        '%onBehalfAddr', // set to empty because flag is false
    );

    const checkerAction = new dfs.actions.checkers.SparkTargetRatioCheck(
        '&targetRatio',
        '&marketAddr',
    );

    sparkBoostOnPriceStrategy.addAction(borrowAction);
    sparkBoostOnPriceStrategy.addAction(sellAction);
    sparkBoostOnPriceStrategy.addAction(feeTakingAction);
    sparkBoostOnPriceStrategy.addAction(supplyAction);
    sparkBoostOnPriceStrategy.addAction(checkerAction);

    return sparkBoostOnPriceStrategy.encodeForDsProxyCall();
};

const createSparkFLBoostOnPriceStrategy = () => {
    const sparkFLBoostOnPriceStrategy = new dfs.Strategy('SparkFLBoostOnPriceStrategy');

    sparkFLBoostOnPriceStrategy.addSubSlot('&collAsset', 'address');
    sparkFLBoostOnPriceStrategy.addSubSlot('&collAssetId', 'uint16');
    sparkFLBoostOnPriceStrategy.addSubSlot('&debtAsset', 'address');
    sparkFLBoostOnPriceStrategy.addSubSlot('&debtAssetId', 'uint16');
    sparkFLBoostOnPriceStrategy.addSubSlot('&marketAddr', 'address');
    sparkFLBoostOnPriceStrategy.addSubSlot('&targetRatio', 'uint256');

    const trigger = new dfs.triggers.SparkQuotePriceTrigger(nullAddress, nullAddress, '0', '0');
    sparkFLBoostOnPriceStrategy.addTrigger(trigger);

    const flAction = new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.SparkFlashLoanAction(
            ['%debtAsset'], // sent by backend
            ['%flAmount'], // sent by backend
            nullAddress,
            [],
        ),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&debtAsset',
            '&collAsset',
            '%amount', //sent by backend
            '%exchangeWrapper', // sent by backend
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%gasStart', '&collAsset', '$2');

    const supplyAction = new dfs.actions.spark.SparkSupplyAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '$3',
        '&proxy',
        '&collAsset',
        '&collAssetId',
        '%enableAsColl', // hardcoded always enable as coll
        '%false', // useOnBehalf, set to false - Sent by backend.
        '%onBehalfAddr', // set to empty because flag is false
    );

    const borrowAction = new dfs.actions.spark.SparkBorrowAction(
        '%false', // useDefaultMarket, hardcoded to false - Sent by backend.
        '&marketAddr',
        '$1',
        '%flAddress',
        '%rateMode',
        '&debtAssetId',
        '%false', // useOnBehalf, set to false - Sent by backend.
        '%onBehalfAddr', // set to empty because flag is false
    );

    const checkerAction = new dfs.actions.checkers.SparkTargetRatioCheck(
        '&targetRatio',
        '&marketAddr',
    );

    sparkFLBoostOnPriceStrategy.addAction(flAction);
    sparkFLBoostOnPriceStrategy.addAction(sellAction);
    sparkFLBoostOnPriceStrategy.addAction(feeTakingAction);
    sparkFLBoostOnPriceStrategy.addAction(supplyAction);
    sparkFLBoostOnPriceStrategy.addAction(borrowAction);
    sparkFLBoostOnPriceStrategy.addAction(checkerAction);

    return sparkFLBoostOnPriceStrategy.encodeForDsProxyCall();
};

module.exports = {
    createRepayStrategy,
    createFLRepayStrategy,
    createMcdCloseToDaiStrategy,
    createLiquityRepayStrategy,
    createLiquityFLRepayStrategy,
    createLiquityFLBoostStrategy,
    createLiquityFLBoostWithCollStrategy,
    createLiquityBoostStrategy,
    createLiquityCloseToCollStrategy,
    createLimitOrderStrategy,
    createDCAStrategy,
    createMcdBoostStrategy,
    createFlMcdBoostStrategy,
    createMcdCloseToCollStrategy,
    createMcdRepayCompositeStrategy,
    createMcdFLRepayCompositeStrategy,
    createMcdBoostCompositeStrategy,
    createMcdFLBoostCompositeStrategy,
    createCompV3RepayStrategy,
    createCompV3EOARepayStrategy,
    createFlCompV3RepayStrategy,
    createFlCompV3EOARepayStrategy,
    createCompV3BoostStrategy,
    createCompV3EOABoostStrategy,
    createCompV3FlBoostStrategy,
    createCompV3EOAFlBoostStrategy,
    createAaveV3BoostStrategy,
    createAaveFLV3BoostStrategy,
    createAaveV3RepayStrategy,
    createAaveFLV3RepayStrategy,
    createAaveV3CloseToDebtStrategy,
    createAaveV3CloseToDebtWithMaximumGasPriceStrategy,
    createAaveV3FLCloseToDebtStrategy,
    createAaveV3FLCloseToDebtWithMaximumGasPriceStrategy,
    createAaveV3CloseToCollStrategy,
    createAaveV3CloseToCollWithMaximumGasPriceStrategy,
    createAaveV3FLCloseToCollStrategy,
    createAaveV3FLCloseToCollWithMaximumGasPriceStrategy,
    createAaveV2RepayStrategy,
    createAaveFLV2RepayStrategy,
    createAaveV2BoostStrategy,
    createAaveFLV2BoostStrategy,
    createCompV2RepayStrategy,
    createCompFLV2RepayStrategy,
    createCompV2BoostStrategy,
    createCompFLV2BoostStrategy,
    createSparkBoostStrategy,
    createSparkFLBoostStrategy,
    createSparkRepayStrategy,
    createSparkFLRepayStrategy,
    createLiquityDsrPaybackStrategy,
    createLiquityDsrSupplyStrategy,
    createLiquityDebtInFrontRepayStrategy,
    createCurveUsdAdvancedRepayStrategy,
    createCurveUsdRepayStrategy,
    createCurveUsdFLRepayStrategy,
    createCurveUsdBoostStrategy,
    createCurveUsdFLCollBoostStrategy,
    createCurveUsdFLDebtBoostStrategy,
    createCurveUsdPaybackStrategy,
    createMorphoBlueBoostStrategy,
    createMorphoBlueFLDebtBoostStrategy,
    createMorphoBlueFLCollBoostStrategy,
    createMorphoBlueRepayStrategy,
    createMorphoBlueFLCollRepayStrategy,
    createMorphoBlueFLDebtRepayStrategy,
    createAaveV3OpenOrderFromCollStrategy,
    createAaveV3FLOpenOrderFromCollStrategy,
    createAaveV3FLOpenOrderFromDebtStrategy,
    createMorphoBlueBoostOnTargetPriceStrategy,
    createMorphoBlueFLBoostOnTargetPriceStrategy,
    createAaveV3RepayOnPriceStrategy,
    createAaveV3FlRepayOnPriceStrategy,
    createLiquityV2RepayStrategy,
    createLiquityV2FLRepayStrategy,
    createLiquityV2BoostStrategy,
    createLiquityV2FLBoostStrategy,
    createLiquityV2FLBoostWithCollStrategy,
    createLiquityV2CloseToCollStrategy,
    createLiquityV2FLCloseToCollStrategy,
    createLiquityV2FLCloseToDebtStrategy,
    createLiquityV2BoostOnPriceStrategy,
    createLiquityV2FLBoostOnPriceStrategy,
    createLiquityV2FLBoostWithCollOnPriceStrategy,
    createLiquityV2RepayOnPriceStrategy,
    createLiquityV2FLRepayOnPriceStrategy,
    createFluidT1RepayStrategy,
    createFluidT1FLRepayStrategy,
    createFluidT1BoostStrategy,
    createFluidT1FLBoostStrategy,
    createLiquityV2PaybackFromSPStrategy,
    createLiquityV2InterestRateAdjustmentStrategy,
    createCompV3BoostOnPriceStrategy,
    createCompV3FLBoostOnPriceStrategy,
    createCompV3RepayOnPriceStrategy,
    createCompV3FLRepayOnPriceStrategy,
    createCompV3FLCloseToDebtStrategy,
    createCompV3FLCloseToCollStrategy,
    createAaveV3GenericBoostStrategy,
    createAaveV3GenericFLBoostStrategy,
    createAaveV3GenericRepayStrategy,
    createAaveV3GenericFLRepayStrategy,
    createAaveV3GenericBoostOnPriceStrategy,
    createAaveV3GenericFLBoostOnPriceStrategy,
    createAaveV3GenericRepayOnPriceStrategy,
    createAaveV3GenericFLRepayOnPriceStrategy,
    createAaveV3GenericFLCloseToCollStrategy,
    createAaveV3GenericFLCloseToDebtStrategy,
    createAaveV3FLCollateralSwitchStrategy,
    createSparkGenericFLCloseToCollStrategy,
    createSparkGenericFLCloseToDebtStrategy,
    createMorphoBlueFLCloseToCollStrategy,
    createMorphoBlueFLCloseToDebtStrategy,
    createSparkRepayOnPriceStrategy,
    createSparkFLRepayOnPriceStrategy,
    createSparkBoostOnPriceStrategy,
    createSparkFLBoostOnPriceStrategy,
};
