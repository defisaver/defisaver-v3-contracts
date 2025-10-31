const dfs = require('@defisaver/sdk');

const { formatExchangeObj, nullAddress } = require('../test/utils/utils');

const createYearnRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('McdYearnRepayStrategy');

    repayStrategy.addSubSlot('&vaultId', 'uint256');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&daiAddr', 'address');
    repayStrategy.addSubSlot('&mcdManager', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const yearnWithdrawAction = new dfs.actions.yearn.YearnWithdrawAction(
        '%yDaiAddr',
        '%amount',
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '&daiAddr', '$1');

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        '&vaultId',
        '$2',
        '&proxy',
        '&mcdManager',
    );

    repayStrategy.addAction(yearnWithdrawAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(mcdPaybackAction);

    return repayStrategy.encodeForDsProxyCall();
};

const createYearnRepayStrategyWithExchange = () => {
    const repayStrategy = new dfs.Strategy('McdYearnRepayWithExchangeStrategy');

    repayStrategy.addSubSlot('&vaultId', 'uint256');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&daiAddr', 'address');
    repayStrategy.addSubSlot('&mcdManager', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const yearnWithdrawAction = new dfs.actions.yearn.YearnWithdrawAction(
        '%ywethAddr',
        '%amount',
        '&proxy',
        '&proxy',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%wethAddr', '&daiAddr', '$1', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '&daiAddr', '$2');

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        '&vaultId',
        '$3',
        '&proxy',
        '&mcdManager',
    );

    repayStrategy.addAction(yearnWithdrawAction);
    repayStrategy.addAction(sellAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(mcdPaybackAction);

    return repayStrategy.encodeForDsProxyCall();
};

const createReflexerRepayStrategy = () => {
    const reflexerRepayStrategy = new dfs.Strategy('ReflexerRepayStrategy');
    reflexerRepayStrategy.addSubSlot('&safeId', 'uint256');
    reflexerRepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const reflexerRatioTrigger = new dfs.triggers.ReflexerRatioTrigger('0', '0', '0');
    reflexerRepayStrategy.addTrigger(reflexerRatioTrigger);

    const reflexerWithdrawAction = new dfs.actions.reflexer.ReflexerWithdrawAction(
        '&safeId',
        '%repayAmount',
        '%adapterAddr',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%repayGasCost', '%wethAddr', '$1');

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%wethAddr', '%raiAddr', '$2', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const reflexerPaybackAction = new dfs.actions.reflexer.ReflexerPaybackAction(
        '&safeId',
        '$3',
        '&proxy',
    );

    reflexerRepayStrategy.addAction(reflexerWithdrawAction);
    reflexerRepayStrategy.addAction(feeTakingAction);
    reflexerRepayStrategy.addAction(sellAction);
    reflexerRepayStrategy.addAction(reflexerPaybackAction);

    return reflexerRepayStrategy.encodeForDsProxyCall();
};

const createReflexerFLRepayStrategy = () => {
    const reflexerFLRepayStrategy = new dfs.Strategy('ReflexerFLRepayStrategy');
    reflexerFLRepayStrategy.addSubSlot('&safeId', 'uint256');
    reflexerFLRepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const reflexerRatioTrigger = new dfs.triggers.ReflexerRatioTrigger('0', '0', '0');
    reflexerFLRepayStrategy.addTrigger(reflexerRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction('%wethAddr', '%repayAmount');

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%repayGasCost', '%wethAddr', '$1');

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%wethAddr', '%raiAddr', '$2', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const reflexerPaybackAction = new dfs.actions.reflexer.ReflexerPaybackAction(
        '&safeId',
        '$3',
        '&proxy',
    );

    const reflexerWithdrawAction = new dfs.actions.reflexer.ReflexerWithdrawAction(
        '&safeId',
        '$1',
        '%adapterAddr',
        '%flAddr',
    );

    reflexerFLRepayStrategy.addAction(flAction);
    reflexerFLRepayStrategy.addAction(feeTakingAction);
    reflexerFLRepayStrategy.addAction(sellAction);
    reflexerFLRepayStrategy.addAction(reflexerPaybackAction);
    reflexerFLRepayStrategy.addAction(reflexerWithdrawAction);

    return reflexerFLRepayStrategy.encodeForDsProxyCall();
};

const createReflexerBoostStrategy = () => {
    const reflexerBoostStrategy = new dfs.Strategy('ReflexerBoostStrategy');
    reflexerBoostStrategy.addSubSlot('&safeId', 'uint256');
    reflexerBoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const reflexerRatioTrigger = new dfs.triggers.ReflexerRatioTrigger('0', '0', '0');
    reflexerBoostStrategy.addTrigger(reflexerRatioTrigger);

    const reflexerGenerateAction = new dfs.actions.reflexer.ReflexerGenerateAction(
        '&safeId',
        '%boostAmount',
        '&proxy',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%raiAddr', '%wethAddr', '$1', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%boostGasCost', '%wethAddr', '$2');

    const reflexerSupplyAction = new dfs.actions.reflexer.ReflexerSupplyAction(
        '&safeId',
        '$3',
        '%adapterAddr',
        '&proxy',
    );

    reflexerBoostStrategy.addAction(reflexerGenerateAction);
    reflexerBoostStrategy.addAction(sellAction);
    reflexerBoostStrategy.addAction(feeTakingAction);
    reflexerBoostStrategy.addAction(reflexerSupplyAction);

    return reflexerBoostStrategy.encodeForDsProxyCall();
};

const createReflexerFLBoostStrategy = () => {
    const reflexerFLBoostStrategy = new dfs.Strategy('ReflexerFLBoostStrategy');
    reflexerFLBoostStrategy.addSubSlot('&safeId', 'uint256');
    reflexerFLBoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const reflexerRatioTrigger = new dfs.triggers.ReflexerRatioTrigger('0', '0', '0');
    reflexerFLBoostStrategy.addTrigger(reflexerRatioTrigger);

    const flAction = new dfs.actions.flashloan.AaveV2FlashLoanAction(
        ['%raiAddr'],
        ['%boostAmount'],
        ['%AAVE_NO_DEBT_MODE'],
        nullAddress,
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj('%raiAddr', '%wethAddr', '$1', '%wrapper'),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('%boostGasCost', '%wethAddr', '$2');

    const reflexerSupplyAction = new dfs.actions.reflexer.ReflexerSupplyAction(
        '&safeId',
        '$3',
        '%adapterAddr',
        '&proxy',
    );

    const reflexerGenerateAction = new dfs.actions.reflexer.ReflexerGenerateAction(
        '&safeId',
        '$1',
        '%FLAddr',
    );

    reflexerFLBoostStrategy.addAction(flAction);
    reflexerFLBoostStrategy.addAction(sellAction);
    reflexerFLBoostStrategy.addAction(feeTakingAction);
    reflexerFLBoostStrategy.addAction(reflexerSupplyAction);
    reflexerFLBoostStrategy.addAction(reflexerGenerateAction);

    return reflexerFLBoostStrategy.encodeForDsProxyCall();
};

const createContinuousUniV3CollectStrategy = () => {
    const continuousUniV3Strat = new dfs.Strategy('Continuous-UniV3-Collect-Strategy');
    continuousUniV3Strat.addSubSlot('&tokenId', 'uint256');
    continuousUniV3Strat.addSubSlot('&recipient', 'address');

    const timestampTrigger = new dfs.triggers.TimestampTrigger('0');
    continuousUniV3Strat.addTrigger(timestampTrigger);

    const gasTrigger = new dfs.triggers.GasPriceTrigger('0');
    continuousUniV3Strat.addTrigger(gasTrigger);

    const collectAction = new dfs.actions.uniswapV3.UniswapV3CollectAction(
        '&tokenId',
        '&recipient',
        '%amount0Max',
        '%amount1Max',
        '%nftOwner',
    );
    continuousUniV3Strat.addAction(collectAction);
    return continuousUniV3Strat.encodeForDsProxyCall();
};

const createCbRebondStrategy = () => {
    const cbRebondStrategy = new dfs.Strategy('CBRebondStrategy');

    cbRebondStrategy.addSubSlot('&subID', 'uint256');
    cbRebondStrategy.addSubSlot('&bondID', 'uint256');
    cbRebondStrategy.addSubSlot('&bLUSDToken', 'address');
    cbRebondStrategy.addSubSlot('&lusdToken', 'address');

    const cbRebondTrigger = new dfs.triggers.CBRebondTrigger('0');
    cbRebondStrategy.addTrigger(cbRebondTrigger);

    const cbChickenInAction = new dfs.actions.chickenBonds.CBChickenInAction(
        '&bondID', // bondID hardcoded from sub slot
        '&proxy', // _to hardcoded to proxy
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&bLUSDToken', // hardcoded as it's always bLUSD
            '&lusdToken', // hardcoded as it's always LUSD
            '$1', //  hardcoded from chickenIn Amount
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction('0', '&lusdToken', '$2');

    const cbCreateAction = new dfs.actions.chickenBonds.CBCreateAction(
        '$3', // lusdAmount from the gas fee action
        '&proxy', // from hardcoded proxy
    );

    const cbUpdateRebondSubAction = new dfs.actions.chickenBonds.CBUpdateRebondSubAction(
        '&subID', // hardcoded subId from subscription
        '$4', // hardcoded bondId from return value
    );

    cbRebondStrategy.addAction(cbChickenInAction);
    cbRebondStrategy.addAction(sellAction);
    cbRebondStrategy.addAction(feeTakingAction);
    cbRebondStrategy.addAction(cbCreateAction);
    cbRebondStrategy.addAction(cbUpdateRebondSubAction);

    return cbRebondStrategy.encodeForDsProxyCall();
};

const createLiquityPaybackChickenInStrategy = () => {
    const strategy = new dfs.Strategy('LiquityPaybackChickenInStrategy');
    strategy.addSubSlot('&paybackSourceId', 'uint256');
    strategy.addSubSlot('&paybackSourceType', 'uint256');
    strategy.addSubSlot('&LUSD', 'address');
    strategy.addSubSlot('&BLUSD', 'address');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    strategy.addTrigger(liquityRatioTrigger);

    const fetchBondIdAction = new dfs.actions.chickenBonds.FetchBondIdAction(
        '&paybackSourceId',
        '&paybackSourceType',
        '%bondIdIfRebondSub',
    );
    const cbChickenInAction = new dfs.actions.chickenBonds.CBChickenInAction(
        '$1', // bondId received from FetchBondId
        '&proxy',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&BLUSD',
            '&LUSD',
            '$2', //  bluds amount received from Chicken In
            '%exchangeWrapper', // can pick exchange wrapper
        ),
        '&proxy', // hardcoded
        '&proxy', // hardcoded
    );
    const feeAction = new dfs.actions.basic.GasFeeAction('0', '&LUSD', '$3');
    const paybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '%paybackAmount(maxUint)',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );
    const sendTokenAction = new dfs.actions.basic.SendTokenAction(
        '&LUSD',
        '&eoa',
        '%lusdAmountLeft(maxUint)',
    );
    strategy.addAction(fetchBondIdAction);
    strategy.addAction(cbChickenInAction);
    strategy.addAction(sellAction);
    strategy.addAction(feeAction);
    strategy.addAction(paybackAction);
    strategy.addAction(sendTokenAction);

    return strategy.encodeForDsProxyCall();
};

const createLiquityPaybackChickenOutStrategy = () => {
    const strategy = new dfs.Strategy('LiquityPaybackChickenOutStrategy');
    strategy.addSubSlot('&paybackSourceId', 'uint256');
    strategy.addSubSlot('&paybackSourceType', 'uint256');
    strategy.addSubSlot('&LUSD', 'address');
    strategy.addSubSlot('&BLUSD', 'address');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    strategy.addTrigger(liquityRatioTrigger);
    const fetchBondIdAction = new dfs.actions.chickenBonds.FetchBondIdAction(
        '&paybackSourceId',
        '&paybackSourceType',
        '%bondIdIfRebondSub',
    );
    const cbChickenOutAction = new dfs.actions.chickenBonds.CBChickenOutAction(
        '$1',
        '%minLusd', // sent from backend to support emergency repayments, but should default to bond.lusdAmountDeposited almost always
        '&proxy',
    );
    const feeAction = new dfs.actions.basic.GasFeeAction('0', '&LUSD', '$2');
    const paybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '%paybackAmount(maxUint)',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );
    const sendTokenAction = new dfs.actions.basic.SendTokenAction(
        '&LUSD',
        '&eoa',
        '%lusdAmountLeft(maxUint)',
    );
    strategy.addAction(fetchBondIdAction);
    strategy.addAction(cbChickenOutAction);
    strategy.addAction(feeAction);
    strategy.addAction(paybackAction);
    strategy.addAction(sendTokenAction);

    return strategy.encodeForDsProxyCall();
};

const createMorphoAaveV2FLBoostStrategy = () => {
    const strategy = new dfs.Strategy('MorphoAaveV2FLBoostStrategy');

    strategy.addSubSlot('&ratioState', 'uint256');
    strategy.addSubSlot('&targetRatio', 'uint256');

    strategy.addTrigger(new dfs.triggers.MorphoAaveV2RatioTrigger('%nullAddr', '%0', '%0'));
    strategy.addAction(
        new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.BalancerFlashLoanAction(
                ['%collAddr'],
                ['%loanAmount'],
                nullAddress,
                [],
            ),
        ),
    );
    strategy.addAction(
        new dfs.actions.basic.SellAction(
            formatExchangeObj('%dAsset', '%cAsset', '%exchangeAmount', '%exchangeWrapper'),
            '&proxy',
            '&proxy',
        ),
    );
    strategy.addAction(new dfs.actions.basic.GasFeeAction('%gasCost', '%cAsset', '$2'));
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2SupplyAction('%cAsset', '$3', '&proxy', '&proxy'),
    );
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2BorrowAction('%dAsset', '$1', '%flAddress'),
    );
    strategy.addAction(
        new dfs.actions.checkers.MorphoAaveV2RatioCheckAction(
            '&ratioState',
            '&targetRatio',
            '&proxy',
        ),
    );

    return strategy.encodeForDsProxyCall();
};

const createMorphoAaveV2BoostStrategy = () => {
    const strategy = new dfs.Strategy('MorphoAaveV2BoostStrategy');

    strategy.addSubSlot('&ratioState', 'uint256');
    strategy.addSubSlot('&targetRatio', 'uint256');

    strategy.addTrigger(new dfs.triggers.MorphoAaveV2RatioTrigger('%nullAddr', '%0', '%0'));
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2BorrowAction('%dAsset', '%boostAmount', '&proxy'),
    );
    strategy.addAction(
        new dfs.actions.basic.SellAction(
            formatExchangeObj('%dAsset', '%cAsset', '$1', '%exchangeWrapper'),
            '&proxy',
            '&proxy',
        ),
    );
    strategy.addAction(new dfs.actions.basic.GasFeeAction('%gasCost', '%cAsset', '$2'));
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2SupplyAction('%cAsset', '$3', '&proxy', '&proxy'),
    );
    strategy.addAction(
        new dfs.actions.checkers.MorphoAaveV2RatioCheckAction(
            '&ratioState',
            '&targetRatio',
            '&proxy',
        ),
    );

    return strategy.encodeForDsProxyCall();
};

const createMorphoAaveV2FLRepayStrategy = () => {
    const strategy = new dfs.Strategy('MorphoAaveV2FLRepayStrategy');

    strategy.addSubSlot('&ratioState', 'uint256');
    strategy.addSubSlot('&targetRatio', 'uint256');

    strategy.addTrigger(new dfs.triggers.MorphoAaveV2RatioTrigger('%nullAddr', '%0', '%0'));
    strategy.addAction(
        new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.BalancerFlashLoanAction(
                ['%collAddr'],
                ['%loanAmount'],
                nullAddress,
                [],
            ),
        ),
    );
    strategy.addAction(
        new dfs.actions.basic.SellAction(
            formatExchangeObj('%cAsset', '%dAsset', '%exchangeAmount', '%exchangeWrapper'),
            '&proxy',
            '&proxy',
        ),
    );
    strategy.addAction(new dfs.actions.basic.GasFeeAction('%gasCost', '%dAsset', '$2'));
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2PaybackAction('%dAsset', '$3', '&proxy', '&proxy'),
    );
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2WithdrawAction('%cAsset', '$1', '%flAddr'),
    );
    strategy.addAction(
        new dfs.actions.checkers.MorphoAaveV2RatioCheckAction(
            '&ratioState',
            '&targetRatio',
            '&proxy',
        ),
    );

    return strategy.encodeForDsProxyCall();
};

const createMorphoAaveV2RepayStrategy = () => {
    const strategy = new dfs.Strategy('MorphoAaveV2RepayStrategy');

    strategy.addSubSlot('&ratioState', 'uint256');
    strategy.addSubSlot('&targetRatio', 'uint256');

    strategy.addTrigger(new dfs.triggers.MorphoAaveV2RatioTrigger('%nullAddr', '%0', '%0'));
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2WithdrawAction('%cAsset', '%repayAmount', '&proxy'),
    );
    strategy.addAction(
        new dfs.actions.basic.SellAction(
            formatExchangeObj('%cAsset', '%dAsset', '$1', '%exchangeWrapper'),
            '&proxy',
            '&proxy',
        ),
    );
    strategy.addAction(new dfs.actions.basic.GasFeeAction('%gasCost', '%dAsset', '$2'));
    strategy.addAction(
        new dfs.actions.morpho.MorphoAaveV2PaybackAction('%dAsset', '$3', '&proxy', '&proxy'),
    );
    strategy.addAction(
        new dfs.actions.checkers.MorphoAaveV2RatioCheckAction(
            '&ratioState',
            '&targetRatio',
            '&proxy',
        ),
    );

    return strategy.encodeForDsProxyCall();
};

module.exports = {
    createYearnRepayStrategy,
    createYearnRepayStrategyWithExchange,
    createReflexerRepayStrategy,
    createReflexerFLRepayStrategy,
    createReflexerBoostStrategy,
    createReflexerFLBoostStrategy,
    createContinuousUniV3CollectStrategy,
    createCbRebondStrategy,
    createLiquityPaybackChickenInStrategy,
    createLiquityPaybackChickenOutStrategy,
    createMorphoAaveV2FLBoostStrategy,
    createMorphoAaveV2BoostStrategy,
    createMorphoAaveV2FLRepayStrategy,
    createMorphoAaveV2RepayStrategy,
};
