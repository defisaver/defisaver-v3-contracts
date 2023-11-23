const dfs = require('@defisaver/sdk');

const {
    formatExchangeObj,
    nullAddress,
    placeHolderAddr,
} = require('./utils');

const createUniV3RangeOrderStrategy = () => {
    const rangeOrderStrategy = new dfs.Strategy('UniV3RangeOrderStrategy');
    rangeOrderStrategy.addSubSlot('&tokenId', 'uint256');
    rangeOrderStrategy.addSubSlot('&recipient', 'address');

    const univ3TickTrigger = new dfs.triggers.UniV3CurrentTickTrigger('0', '0');
    rangeOrderStrategy.addTrigger(univ3TickTrigger);

    const withdrawAction = new dfs.actions.uniswapV3.UniswapV3WithdrawAction(
        '&tokenId',
        '%liquidityAmount',
        '%amount0Min',
        '%amount1Min',
        '%deadline',
        '&recipient',
        '%amount0Max',
        '%amount1Max',
        '%nftOwner',
    );
    rangeOrderStrategy.addAction(withdrawAction);
    return rangeOrderStrategy.encodeForDsProxyCall();
};

const createRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('McdRepayStrategy');

    repayStrategy.addSubSlot('&vaultId', 'uint256');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&daiAddr', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const ratioAction = new dfs.actions.maker.MakerRatioAction(
        '&vaultId',
    );

    const withdrawAction = new dfs.actions.maker.MakerWithdrawAction(
        '&vaultId',
        '%withdrawAmount',
        '%ethJoin',
        '&proxy',
        '%mcdManager',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '%wethAddr', '$2',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%wethAddr',
            '&daiAddr',
            '$3',
            '%exchangeWrapper',
        ),
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

    const ratioAction = new dfs.actions.maker.MakerRatioAction(
        '&vaultId',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%wethAddr',
            '&daiAddr',
            '$1',
            '%exchangeWrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&daiAddr', '$3',
    );

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
        formatExchangeObj(
            '%wethAddr',
            '&daiAddr',
            '%repayAmount',
            '%exchangeWrapper',
        ),
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
        formatExchangeObj(
            '%wethAddr',
            '&daiAddr',
            '%repayAmount',
            '%exchangeWrapper',
        ),
    );

    repayStrategy.addAction(repayCompositeAction);

    return repayStrategy.encodeForDsProxyCall();
};

const createRariRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('McdRariRepayStrategy');

    repayStrategy.addSubSlot('&vaultId', 'uint256');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&daiAddr', 'address');
    repayStrategy.addSubSlot('&mcdManager', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const rariWithdrawAction = new dfs.actions.rari.RariWithdrawAction(
        '%fundManager',
        '%poolTokenAddress',
        '%poolTokensAmountToPull',
        '&proxy',
        '%stablecoinAddress',
        '%stablecoinAmountToWithdraw',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&daiAddr', '$1',
    );

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        '&vaultId',
        '$2',
        '&proxy',
        '&mcdManager',
    );

    repayStrategy.addAction(rariWithdrawAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(mcdPaybackAction);

    return repayStrategy.encodeForDsProxyCall();
};

const createRariRepayStrategyWithExchange = () => {
    const repayStrategy = new dfs.Strategy('McdRariRepayWithExchangeStrategy');

    repayStrategy.addSubSlot('&vaultId', 'uint256');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&daiAddr', 'address');
    repayStrategy.addSubSlot('&mcdManager', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const rariWithdrawAction = new dfs.actions.rari.RariWithdrawAction(
        '%fundManager',
        '%poolTokenAddress',
        '%poolTokensAmountToPull',
        '&proxy',
        '%stablecoinAddress',
        '%stablecoinAmountToWithdraw',
        '&proxy',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%usdcAddr',
            '&daiAddr',
            '$1',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&daiAddr', '$2',
    );

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        '&vaultId',
        '$3',
        '&proxy',
        '&mcdManager',
    );

    repayStrategy.addAction(rariWithdrawAction);
    repayStrategy.addAction(sellAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(mcdPaybackAction);

    return repayStrategy.encodeForDsProxyCall();
};

const createMstableRepayStrategy = () => {
    const repayStrategy = new dfs.Strategy('McdMstableRepayStrategy');

    repayStrategy.addSubSlot('&vaultId', 'uint256');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&daiAddr', 'address');
    repayStrategy.addSubSlot('&mcdManager', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const mstableWithdrawAction = new dfs.actions.mstable.MStableWithdrawAction(
        '%bAsset',
        '%mAsset',
        '%saveAddress',
        '%vaultAddress',
        '&proxy',
        '&proxy',
        '%amount',
        '%minOut',
        '%assetPair',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&daiAddr', '$1',
    );

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        '&vaultId',
        '$2',
        '&proxy',
        '&mcdManager',
    );

    repayStrategy.addAction(mstableWithdrawAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(mcdPaybackAction);

    return repayStrategy.encodeForDsProxyCall();
};

const createMstableRepayStrategyWithExchange = () => {
    const repayStrategy = new dfs.Strategy('McdMstableRepayWithExchangeStrategy');

    repayStrategy.addSubSlot('&vaultId', 'uint256');
    repayStrategy.addSubSlot('&targetRatio', 'uint256');
    repayStrategy.addSubSlot('&daiAddr', 'address');
    repayStrategy.addSubSlot('&mcdManager', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const mstableWithdrawAction = new dfs.actions.mstable.MStableWithdrawAction(
        '%bAsset',
        '%mAsset',
        '%saveAddress',
        '%vaultAddress',
        '&proxy',
        '&proxy',
        '%amount',
        '%minOut',
        '%assetPair',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%wethAddr',
            '&daiAddr',
            '$1',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&daiAddr', '$2',
    );

    const mcdPaybackAction = new dfs.actions.maker.MakerPaybackAction(
        '&vaultId',
        '$3',
        '&proxy',
        '&mcdManager',
    );

    repayStrategy.addAction(mstableWithdrawAction);
    repayStrategy.addAction(sellAction);
    repayStrategy.addAction(feeTakingAction);
    repayStrategy.addAction(mcdPaybackAction);

    return repayStrategy.encodeForDsProxyCall();
};

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&daiAddr', '$1',
    );

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
        formatExchangeObj(
            '%wethAddr',
            '&daiAddr',
            '$1',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&daiAddr', '$2',
    );

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%repayGasCost', '%wethAddr', '$1',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%wethAddr',
            '%raiAddr',
            '$2',
            '%wrapper',
        ),
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%repayGasCost', '%wethAddr', '$1',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%wethAddr',
            '%raiAddr',
            '$2',
            '%wrapper',
        ),
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
        formatExchangeObj(
            '%raiAddr',
            '%wethAddr',
            '$1',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%boostGasCost', '%wethAddr', '$2',
    );

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

    const flAction = new dfs.actions.flashloan.AaveV2FlashLoanAction(['%raiAddr'], ['%boostAmount'], ['%AAVE_NO_DEBT_MODE'], nullAddress);

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%raiAddr',
            '%wethAddr',
            '$1',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%boostGasCost', '%wethAddr', '$2',
    );

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
        new dfs.actions.flashloan.MakerFlashLoanAction(
            '%loanAmount', // cdp.debt + a bit extra to handle debt increasing
            nullAddress,
            [],
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
        new dfs.actions.basic.GasFeeAction(
            '%repayGasCost', '&daiAddr', '$4', 0,
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
        new dfs.actions.flashloan.MakerFlashLoanAction(
            '%loanAmount', // cdp.debt + a bit extra to handle debt increasing
            nullAddress,
            [],
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
        formatExchangeObj(
            '%wethAddr',
            '%lusdAddr',
            '$1',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%repayGasCost', '%lusdAddr', '$2',
    );

    const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '$3',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
        '&ratioState', '&targetRatio',
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
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%wethAddr'],
            ['%flAmount'],
        ),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&wethAddr',
            '&lusdAddr',
            '%exchangeAmount',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%repayGasCost', '&lusdAddr', '$2',
    );

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
        new dfs.actions.checkers.LiquityRatioIncreaseCheckAction(
            '&ratioIncrease',
        );

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
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%wethAddr'],
            ['%flAmount'],
        ),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%wethAddr',
            '%lusdAddr',
            '%exchangeAmount',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%repayGasCost', '%lusdAddr', '$2',
    );

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
        '&ratioState', '&targetRatio',
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
        formatExchangeObj(
            '%lusdAddr',
            '%wethAddr',
            '$1',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%boostGasCost', '%wethAddr', '$2',
    );

    const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
        '$3',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
        '&ratioState', '&targetRatio',
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
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%lusdAddr'],
            ['%flAmount'],
        ),
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%lusdAddr',
            '%wethAddr',
            '%exchangeAmount',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%boostGasCost', '%wethAddr', '$2',
    );

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
        '&ratioState', '&targetRatio',
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
        new dfs.actions.flashloan.BalancerFlashLoanAction(
            ['%wethAddr'],
            ['%flAmount'],
        ),
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
        formatExchangeObj(
            '%lusdAddr',
            '%wethAddr',
            '$2',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%boostGasCost', '%wethAddr', '$3',
    );

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
        '&ratioState', '&targetRatio',
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
    const strategyName = isTrailing ? 'LiquityTrailingCloseToCollStrategy' : 'LiquityCloseToCollStrategy';

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&weth', '$3',
    );

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

    console.log(liquityCloseToCollStrategy.encodeForDsProxyCall());

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
        formatExchangeObj(
            '&tokenAddrSell',
            '&tokenAddrBuy',
            '&amount',
            '%exchangeWrapper',
        ),
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
        formatExchangeObj(
            '&sellToken',
            '&buyToken',
            '&amount',
            '%exchangeWrapper',
        ),
        '&eoa',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&buyToken', '$1',
    );

    const sendTokenAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
        '&buyToken', '&eoa', '$2',
    );

    dcaStrategy.addAction(sellAction);
    dcaStrategy.addAction(feeTakingAction);
    dcaStrategy.addAction(sendTokenAction);

    return dcaStrategy.encodeForDsProxyCall();
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

const createMcdBoostStrategy = () => {
    const mcdBoostStrategy = new dfs.Strategy('MakerBoostStrategy');
    mcdBoostStrategy.addSubSlot('&vaultId', 'uint256');
    mcdBoostStrategy.addSubSlot('&targetRatio', 'uint256');
    mcdBoostStrategy.addSubSlot('&daiAddr', 'address');

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    mcdBoostStrategy.addTrigger(mcdRatioTrigger);

    const ratioAction = new dfs.actions.maker.MakerRatioAction(
        '&vaultId',
    );

    const generateAction = new dfs.actions.maker.MakerGenerateAction(
        '&vaultId',
        '%generateAmount',
        '&proxy',
        '%managerAddr',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&daiAddr',
            '%wethAddr',
            '$2',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '%wethAddr', '$3',
    );

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

    const ratioAction = new dfs.actions.maker.MakerRatioAction(
        '&vaultId',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&daiAddr',
            '%wethAddr',
            '$1',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '%wethAddr', '$3',
    );

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
        formatExchangeObj(
            '&daiAddr',
            '%wethAddr',
            '%boostAmount',
            '%wrapper',
        ),
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

    const flAction = new dfs.actions.flashloan.MakerFlashLoanAction(
        '%loanAmount',
        nullAddress,
        [],
    );

    mcdBoostStrategy.addAction(new dfs.actions.flashloan.FLAction(flAction));

    const boostCompositeAction = new dfs.actions.maker.MakerBoostCompositeAction(
        '&vaultId',
        '%joinAddr',
        '%gasUsed',
        '%flAddr',
        '$1',
        '%nextPrice',
        '%targetRatio',
        formatExchangeObj(
            '&daiAddr',
            '%wethAddr',
            '%boostAmount',
            '%wrapper',
        ),
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&baseToken', '$2',
    );

    const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market', // hardcoded
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
        '&proxy', // proxy hardcoded (onBehalf)
        placeHolderAddr, // additional only needed for sdk for front
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState', '&targetRatio', '&market',
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&baseToken', '$2',
    );

    const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
        '&market', // hardcoded
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
        '&eoa', // proxy hardcoded (onBehalf)
        placeHolderAddr, // additional only needed for sdk for front
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState', '&targetRatio', '&market', '&eoa',
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

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(['%collAddr'], ['%repayAmount']);

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&baseToken', '$2',
    );

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
        '&ratioState', '&targetRatio', '&market',
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

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(['%collAddr'], ['%repayAmount']);

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&baseToken', '$2',
    );

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
        '&ratioState', '&targetRatio', '&market', '&eoa',
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '%collToken', '$2',
    );

    const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        '&market', // hardcoded
        '%collAsset', // variable coll token
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState', '&targetRatio', '&market',
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '%collToken', '$2',
    );

    const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
        '&market', // hardcoded
        '%collAsset', // variable coll token
        '$3', // amount hardcoded
        '&proxy', // proxy hardcoded (from)
        '&eoa', // hardcoded onBehalf, supply to user
    );

    const checkerAction = new dfs.actions.checkers.CompoundV3RatioCheckAction(
        '&ratioState', '&targetRatio', '&market', '&eoa',
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

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(['%baseToken'], ['%boostAmount']);

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '%collToken', '$2',
    );

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
        '&ratioState', '&targetRatio', '&market',
    );

    compV3BoostStrategy.addAction(flAction);
    compV3BoostStrategy.addAction(sellAction);
    compV3BoostStrategy.addAction(feeTakingAction);
    compV3BoostStrategy.addAction(supplyAction);
    compV3BoostStrategy.addAction(borrowAction);
    compV3BoostStrategy.addAction(checkerAction);

    return compV3BoostStrategy.encodeForDsProxyCall();
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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&lusdToken', '$2',
    );

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

const createCompV3EOAFlBoostStrategy = () => {
    const compV3BoostStrategy = new dfs.Strategy('CompV3EOAFlBoostStrategy');

    compV3BoostStrategy.addSubSlot('&market', 'address');
    compV3BoostStrategy.addSubSlot('&baseToken', 'address');
    compV3BoostStrategy.addSubSlot('&ratioState', 'uint256');
    compV3BoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const compV3Trigger = new dfs.triggers.CompV3RatioTrigger('0', '0', '0');
    compV3BoostStrategy.addTrigger(compV3Trigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(['%baseToken'], ['%boostAmount']);

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

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '%collToken', '$2',
    );

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
        '&ratioState', '&targetRatio', '&market', '&eoa',
    );

    compV3BoostStrategy.addAction(flAction);
    compV3BoostStrategy.addAction(sellAction);
    compV3BoostStrategy.addAction(feeTakingAction);
    compV3BoostStrategy.addAction(supplyAction);
    compV3BoostStrategy.addAction(borrowAction);
    compV3BoostStrategy.addAction(checkerAction);

    return compV3BoostStrategy.encodeForDsProxyCall();
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
    const feeAction = new dfs.actions.basic.GasFeeAction(
        '0', '&LUSD', '$3',
    );
    const paybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '%paybackAmount(maxUint)', '&proxy', '%upperHint', '%lowerHint',
    );
    const sendTokenAction = new dfs.actions.basic.SendTokenAction(
        '&LUSD', '&eoa', '%lusdAmountLeft(maxUint)',
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
    const feeAction = new dfs.actions.basic.GasFeeAction(
        '0', '&LUSD', '$2',
    );
    const paybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '%paybackAmount(maxUint)', '&proxy', '%upperHint', '%lowerHint',
    );
    const sendTokenAction = new dfs.actions.basic.SendTokenAction(
        '&LUSD', '&eoa', '%lusdAmountLeft(maxUint)',
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

    strategy.addTrigger(new dfs.triggers.MorphoAaveV2RatioTrigger(
        '%nullAddr', '%0', '%0',
    ));
    strategy.addAction(new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.EulerFlashLoanAction(
            '%dAsset', '%flAmount',
        ),
    ));
    strategy.addAction(new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%dAsset',
            '%cAsset',
            '%exchangeAmount',
            '%exchangeWrapper',
        ),
        '&proxy',
        '&proxy',
    ));
    strategy.addAction(new dfs.actions.basic.GasFeeAction(
        '%gasCost', '%cAsset', '$2',
    ));
    strategy.addAction(new dfs.actions.morpho.MorphoAaveV2SupplyAction(
        '%cAsset', '$3', '&proxy', '&proxy',
    ));
    strategy.addAction(new dfs.actions.morpho.MorphoAaveV2BorrowAction(
        '%dAsset', '$1', '%flAddress',
    ));
    strategy.addAction(new dfs.actions.checkers.MorphoAaveV2RatioCheckAction(
        '&ratioState', '&targetRatio', '&proxy',
    ));

    return strategy.encodeForDsProxyCall();
};

const createMorphoAaveV2BoostStrategy = () => {
    const strategy = new dfs.Strategy('MorphoAaveV2BoostStrategy');

    strategy.addSubSlot('&ratioState', 'uint256');
    strategy.addSubSlot('&targetRatio', 'uint256');

    strategy.addTrigger(new dfs.triggers.MorphoAaveV2RatioTrigger(
        '%nullAddr', '%0', '%0',
    ));
    strategy.addAction(new dfs.actions.morpho.MorphoAaveV2BorrowAction(
        '%dAsset', '%boostAmount', '&proxy',
    ));
    strategy.addAction(new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%dAsset',
            '%cAsset',
            '$1',
            '%exchangeWrapper',
        ),
        '&proxy',
        '&proxy',
    ));
    strategy.addAction(new dfs.actions.basic.GasFeeAction(
        '%gasCost', '%cAsset', '$2',
    ));
    strategy.addAction(new dfs.actions.morpho.MorphoAaveV2SupplyAction(
        '%cAsset', '$3', '&proxy', '&proxy',
    ));
    strategy.addAction(new dfs.actions.checkers.MorphoAaveV2RatioCheckAction(
        '&ratioState', '&targetRatio', '&proxy',
    ));

    return strategy.encodeForDsProxyCall();
};

const createMorphoAaveV2FLRepayStrategy = () => {
    const strategy = new dfs.Strategy('MorphoAaveV2FLRepayStrategy');

    strategy.addSubSlot('&ratioState', 'uint256');
    strategy.addSubSlot('&targetRatio', 'uint256');

    strategy.addTrigger(new dfs.triggers.MorphoAaveV2RatioTrigger(
        '%nullAddr', '%0', '%0',
    ));
    strategy.addAction(new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.EulerFlashLoanAction(
            '%cAsset', '%flAmount',
        ),
    ));
    strategy.addAction(new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%cAsset',
            '%dAsset',
            '%exchangeAmount',
            '%exchangeWrapper',
        ),
        '&proxy',
        '&proxy',
    ));
    strategy.addAction(new dfs.actions.basic.GasFeeAction(
        '%gasCost', '%dAsset', '$2',
    ));
    strategy.addAction(new dfs.actions.morpho.MorphoAaveV2PaybackAction(
        '%dAsset', '$3', '&proxy', '&proxy',
    ));
    strategy.addAction(new dfs.actions.morpho.MorphoAaveV2WithdrawAction(
        '%cAsset', '$1', '%flAddr',
    ));
    strategy.addAction(new dfs.actions.checkers.MorphoAaveV2RatioCheckAction(
        '&ratioState', '&targetRatio', '&proxy',
    ));

    return strategy.encodeForDsProxyCall();
};

const createMorphoAaveV2RepayStrategy = () => {
    const strategy = new dfs.Strategy('MorphoAaveV2RepayStrategy');

    strategy.addSubSlot('&ratioState', 'uint256');
    strategy.addSubSlot('&targetRatio', 'uint256');

    strategy.addTrigger(new dfs.triggers.MorphoAaveV2RatioTrigger(
        '%nullAddr', '%0', '%0',
    ));
    strategy.addAction(new dfs.actions.morpho.MorphoAaveV2WithdrawAction(
        '%cAsset', '%repayAmount', '&proxy',
    ));
    strategy.addAction(new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%cAsset',
            '%dAsset',
            '$1',
            '%exchangeWrapper',
        ),
        '&proxy',
        '&proxy',
    ));
    strategy.addAction(new dfs.actions.basic.GasFeeAction(
        '%gasCost', '%dAsset', '$2',
    ));
    strategy.addAction(new dfs.actions.morpho.MorphoAaveV2PaybackAction(
        '%dAsset', '$3', '&proxy', '&proxy',
    ));
    strategy.addAction(new dfs.actions.checkers.MorphoAaveV2RatioCheckAction(
        '&ratioState', '&targetRatio', '&proxy',
    ));

    return strategy.encodeForDsProxyCall();
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

const aaveV3CloseActions = {

    // eslint-disable-next-line max-len
    flAction: () => new dfs.actions.flashloan.FLAction(new dfs.actions.flashloan.AaveV3FlashLoanAction(
        ['%debtAsset'],
        ['%repayAmount'], // cant pipe in FL actions :(
        ['%AAVE_NO_DEBT_MODE'],
        '%nullAddress',
    )),

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

    feeTakingActionFL: () => new dfs.actions.basic.GasFeeAction(
        '%gasCost', // must stay variable backend sets gasCost
        '&debtAsset',
        '$4', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    ),

    feeTakingAction: () => new dfs.actions.basic.GasFeeAction(
        '%gasCost', // must stay variable backend sets gasCost
        '&debtAsset',
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    ),

    feeTakingActionFLColl: () => new dfs.actions.basic.GasFeeAction(
        '%gasCost', // must stay variable backend sets gasCost
        '&collAsset',
        '$3', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    ),

    feeTakingActionColl: () => new dfs.actions.basic.GasFeeAction(
        '%gasCost', // must stay variable backend sets gasCost
        '&collAsset',
        '$1', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
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

const sparkCloseActions = {

    // eslint-disable-next-line max-len
    flAction: () => new dfs.actions.flashloan.FLAction(
        new dfs.actions.flashloan.SparkFlashLoanAction(
            ['%debtAsset'],
            ['%repayAmount'], // cant pipe in FL actions :(
            ['%AAVE_NO_DEBT_MODE'],
            '%nullAddress',
        ),
    ),

    paybackAction: () => new dfs.actions.spark.SparkPaybackAction(
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

    withdrawAction: () => new dfs.actions.spark.SparkWithdrawAction(
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

    feeTakingActionFL: () => new dfs.actions.basic.GasFeeAction(
        '%gasCost', // must stay variable backend sets gasCost
        '&debtAsset',
        '$4', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    ),

    feeTakingAction: () => new dfs.actions.basic.GasFeeAction(
        '%gasCost', // must stay variable backend sets gasCost
        '&debtAsset',
        '$2', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    ),

    feeTakingActionFLColl: () => new dfs.actions.basic.GasFeeAction(
        '%gasCost', // must stay variable backend sets gasCost
        '&collAsset',
        '$3', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
    ),

    feeTakingActionColl: () => new dfs.actions.basic.GasFeeAction(
        '%gasCost', // must stay variable backend sets gasCost
        '&collAsset',
        '$1', // hardcoded output from sell action
        '%dfsFeeDivider', // defaults at 0.05%
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

const createSparkCloseStrategyBase = (strategyName) => {
    const sparkCloseStrategy = new dfs.Strategy(strategyName);
    sparkCloseStrategy.addSubSlot('&collAsset', 'address');
    sparkCloseStrategy.addSubSlot('&collAssetId', 'uint16');
    sparkCloseStrategy.addSubSlot('&debtAsset', 'address');
    sparkCloseStrategy.addSubSlot('&debtAssetId', 'uint16');
    sparkCloseStrategy.addSubSlot('&nullAddress', 'address');

    const trigger = new dfs.triggers.SparkQuotePriceTrigger(nullAddress, nullAddress, '0', '0');

    sparkCloseStrategy.addTrigger(trigger);

    return sparkCloseStrategy;
};

const createSparkCloseToDebtStrategy = () => {
    const strategyName = 'SparkCloseToDebt';

    const sparkCloseStrategy = createSparkCloseStrategyBase(strategyName);

    sparkCloseStrategy.addAction(sparkCloseActions.withdrawAction());
    sparkCloseStrategy.addAction(sparkCloseActions.sellAction());
    sparkCloseStrategy.addAction(sparkCloseActions.feeTakingAction());
    sparkCloseStrategy.addAction(sparkCloseActions.paybackAction());
    sparkCloseStrategy.addAction(sparkCloseActions.sendDebt());

    return sparkCloseStrategy.encodeForDsProxyCall();
};

const createSparkFLCloseToDebtStrategy = () => {
    const strategyName = 'SparkFLCloseToDebt';

    const sparkCloseStrategy = createSparkCloseStrategyBase(strategyName);

    sparkCloseStrategy.addAction(sparkCloseActions.flAction());
    sparkCloseStrategy.addAction(sparkCloseActions.paybackAction());
    sparkCloseStrategy.addAction(sparkCloseActions.withdrawAction());
    sparkCloseStrategy.addAction(sparkCloseActions.sellAction());
    sparkCloseStrategy.addAction(sparkCloseActions.feeTakingActionFL());
    sparkCloseStrategy.addAction(sparkCloseActions.sendRepayFL());
    sparkCloseStrategy.addAction(sparkCloseActions.sendDebt());

    return sparkCloseStrategy.encodeForDsProxyCall();
};

const createSparkCloseToCollStrategy = () => {
    const strategyName = 'SparkCloseToColl';

    const sparkCloseStrategy = createSparkCloseStrategyBase(strategyName);

    sparkCloseStrategy.addAction(sparkCloseActions.withdrawAction());
    sparkCloseStrategy.addAction(sparkCloseActions.feeTakingActionColl());
    sparkCloseStrategy.addAction(sparkCloseActions.sellAction());
    sparkCloseStrategy.addAction(sparkCloseActions.paybackAction());
    sparkCloseStrategy.addAction(sparkCloseActions.sendDebt());
    sparkCloseStrategy.addAction(sparkCloseActions.sendColl());

    return sparkCloseStrategy.encodeForDsProxyCall();
};

const createSparkFLCloseToCollStrategy = () => {
    const strategyName = 'SparkFLCloseToColl';

    const sparkCloseStrategy = createSparkCloseStrategyBase(strategyName);

    sparkCloseStrategy.addAction(sparkCloseActions.flAction());
    sparkCloseStrategy.addAction(sparkCloseActions.paybackAction());
    sparkCloseStrategy.addAction(sparkCloseActions.withdrawAction());
    sparkCloseStrategy.addAction(sparkCloseActions.feeTakingActionFLColl());
    sparkCloseStrategy.addAction(sparkCloseActions.sellAction());
    sparkCloseStrategy.addAction(sparkCloseActions.sendRepayFL());
    sparkCloseStrategy.addAction(sparkCloseActions.sendDebt());
    sparkCloseStrategy.addAction(sparkCloseActions.sendColl());

    return sparkCloseStrategy.encodeForDsProxyCall();
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
        formatExchangeObj(
            '&daiAddress',
            '&lusdAddress',
            '$1',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%strategyGasCost', '&lusdAddress', '$2',
    );

    const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '$3',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
        '&ratioState', '&targetRatio',
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
        formatExchangeObj(
            '&daiAddress',
            '&wethAddress',
            '$1',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%strategyGasCost', '&wethAddress', '$2',
    );

    const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
        '$3',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const liquityRatioCheckAction = new dfs.actions.checkers.LiquityRatioCheckAction(
        '&ratioState', '&targetRatio',
    );

    liquityDsrSupplyStrategy.addAction(dsrWithdrawAction);
    liquityDsrSupplyStrategy.addAction(sellAction);
    liquityDsrSupplyStrategy.addAction(feeTakingAction);
    liquityDsrSupplyStrategy.addAction(liquitySupplyAction);
    liquityDsrSupplyStrategy.addAction(liquityRatioCheckAction);

    return liquityDsrSupplyStrategy.encodeForDsProxyCall();
};

module.exports = {
    createUniV3RangeOrderStrategy,
    createRepayStrategy,
    createFLRepayStrategy,
    createYearnRepayStrategy,
    createYearnRepayStrategyWithExchange,
    createRariRepayStrategy,
    createRariRepayStrategyWithExchange,
    createMstableRepayStrategy,
    createMstableRepayStrategyWithExchange,
    createReflexerRepayStrategy,
    createReflexerFLRepayStrategy,
    createReflexerFLBoostStrategy,
    createReflexerBoostStrategy,
    createMcdCloseToDaiStrategy,
    createLiquityRepayStrategy,
    createLiquityFLRepayStrategy,
    createLiquityFLBoostStrategy,
    createLiquityFLBoostWithCollStrategy,
    createLiquityBoostStrategy,
    createLiquityCloseToCollStrategy,
    createLimitOrderStrategy,
    createDCAStrategy,
    createContinuousUniV3CollectStrategy,
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
    createCbRebondStrategy,
    createCompV3EOAFlBoostStrategy,
    createLiquityPaybackChickenInStrategy,
    createLiquityPaybackChickenOutStrategy,
    createMorphoAaveV2FLBoostStrategy,
    createMorphoAaveV2BoostStrategy,
    createMorphoAaveV2FLRepayStrategy,
    createMorphoAaveV2RepayStrategy,
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
    createSparkCloseToDebtStrategy,
    createSparkFLCloseToDebtStrategy,
    createSparkCloseToCollStrategy,
    createSparkFLCloseToCollStrategy,
    createLiquityDsrPaybackStrategy,
    createLiquityDsrSupplyStrategy,
    createLiquityDebtInFrontRepayStrategy,
};
