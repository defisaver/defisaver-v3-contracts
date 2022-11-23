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
            '%daiAddr',
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

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    repayStrategy.addTrigger(mcdRatioTrigger);

    const flAction = new dfs.actions.flashloan.DyDxFlashLoanAction('%amount', '%wethAddr');

    const ratioAction = new dfs.actions.maker.MakerRatioAction(
        '&vaultId',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%wethAddr',
            '%daiAddr',
            '$1',
            '%exchangeWrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '%daiAddr', '$3',
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

    const flAction = new dfs.actions.flashloan.AaveV2FlashLoanAction(['%boostAmount'], ['%raiAddr'], ['%AAVE_NO_DEBT_MODE'], nullAddress);

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
            '%makerFlAddr', // kept variable this can change (FL must be payed back to work)
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
            '%makerFlAddr', // kept variable this can change (FL must be payed back to work)
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
    liquityRepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    liquityRepayStrategy.addTrigger(liquityRatioTrigger);

    const liquityWithdrawAction = new dfs.actions.liquity.LiquityWithdrawAction(
        '%withdrawAmount',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%repayGasCost', '%wethAddr', '$1',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%wethAddr',
            '%lusdAddr',
            '$2',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '$3',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    liquityRepayStrategy.addAction(liquityWithdrawAction);
    liquityRepayStrategy.addAction(feeTakingAction);
    liquityRepayStrategy.addAction(sellAction);
    liquityRepayStrategy.addAction(liquityPaybackAction);

    return liquityRepayStrategy.encodeForDsProxyCall();
};

const createLiquityFLRepayStrategy = () => {
    const liquityFLRepayStrategy = new dfs.Strategy('LiquityFLRepayStrategy');
    liquityFLRepayStrategy.addSubSlot('&targetRatio', 'uint256');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    liquityFLRepayStrategy.addTrigger(liquityRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(['%wethAddr'], ['%repayAmount']);

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%repayGasCost', '%wethAddr', '%flAmountWeGotBack',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%wethAddr',
            '%lusdAddr',
            '$2',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
        '$3',
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

    liquityFLRepayStrategy.addAction(flAction);
    liquityFLRepayStrategy.addAction(feeTakingAction);
    liquityFLRepayStrategy.addAction(sellAction);
    liquityFLRepayStrategy.addAction(liquityPaybackAction);
    liquityFLRepayStrategy.addAction(liquityWithdrawAction);

    return liquityFLRepayStrategy.encodeForDsProxyCall();
};

const createLiquityBoostStrategy = () => {
    const liquityBoostStrategy = new dfs.Strategy('LiquityBoostStrategy');
    liquityBoostStrategy.addSubSlot('&maxFeePercentage', 'uint256');
    liquityBoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    liquityBoostStrategy.addTrigger(liquityRatioTrigger);

    const liquityBorrowAction = new dfs.actions.liquity.LiquityBorrowAction(
        '&maxFeePercentage',
        '%boostAmount',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%lusdAddr',
            '%wethAddr',
            '%flAmountWeGotBack',
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

    liquityBoostStrategy.addAction(liquityBorrowAction);
    liquityBoostStrategy.addAction(sellAction);
    liquityBoostStrategy.addAction(feeTakingAction);
    liquityBoostStrategy.addAction(liquitySupplyAction);

    return liquityBoostStrategy.encodeForDsProxyCall();
};

const createLiquityFLBoostStrategy = () => {
    const liquityFLBoostStrategy = new dfs.Strategy('LiquityFLBoostStrategy');
    liquityFLBoostStrategy.addSubSlot('&maxFeePercentage', 'uint256');
    liquityFLBoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    liquityFLBoostStrategy.addTrigger(liquityRatioTrigger);

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(['%wethAddr'], ['%flAmount']);

    const liquitySupplyFLAction = new dfs.actions.liquity.LiquitySupplyAction(
        '%flAmountWeGotBack',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const liquityBorrowAction = new dfs.actions.liquity.LiquityBorrowAction(
        '&maxFeePercentage',
        '%boostAmount',
        '&proxy',
        '%upperHint',
        '%lowerHint',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%lusdAddr',
            '%wethAddr',
            '$3',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '%boostGasCost', '%wethAddr', '$4',
    );

    const liquitySupplyAction = new dfs.actions.liquity.LiquitySupplyAction(
        '$5',
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

    liquityFLBoostStrategy.addAction(flAction);
    liquityFLBoostStrategy.addAction(liquitySupplyFLAction);
    liquityFLBoostStrategy.addAction(liquityBorrowAction);
    liquityFLBoostStrategy.addAction(sellAction);
    liquityFLBoostStrategy.addAction(feeTakingAction);
    liquityFLBoostStrategy.addAction(liquitySupplyAction);
    liquityFLBoostStrategy.addAction(liquityWithdrawAction);

    return liquityFLBoostStrategy.encodeForDsProxyCall();
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
        '%balancerFlAddr', // kept variable this can change (FL must be payed back to work)
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

    const chainLinkPriceTrigger = new dfs.triggers.ChainLinkPriceTrigger(nullAddress, '0', '0');
    limitOrderStrategy.addTrigger(chainLinkPriceTrigger);

    limitOrderStrategy.addSubSlot('&tokenAddrSell', 'address');
    limitOrderStrategy.addSubSlot('&tokenAddrBuy', 'address');
    limitOrderStrategy.addSubSlot('&amount', 'uint256');

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        '%wethAddr', '&eoa', '&amount',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '%wethAddr', '$1',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&tokenAddrSell',
            '&tokenAddrBuy',
            '$2',
            '%exchangeWrapper',
        ),
        '&proxy',
        '&eoa',
    );

    limitOrderStrategy.addAction(pullTokenAction);
    limitOrderStrategy.addAction(feeTakingAction);
    limitOrderStrategy.addAction(sellAction);

    return limitOrderStrategy.encodeForDsProxyCall();
};

const createDCAStrategy = () => {
    const dcaStrategy = new dfs.Strategy('DCAStrategy');

    dcaStrategy.addSubSlot('&tokenAddrSell', 'address');
    dcaStrategy.addSubSlot('&tokenAddrBuy', 'address');
    dcaStrategy.addSubSlot('&amount', 'uint256');
    dcaStrategy.addSubSlot('&interval', 'uint256');
    dcaStrategy.addSubSlot('&lastTimestamp', 'uint256');
    dcaStrategy.addSubSlot('&proxy', 'address');
    dcaStrategy.addSubSlot('&eoa', 'address');

    const timestampTrigger = new dfs.triggers.TimestampTrigger('0');
    dcaStrategy.addTrigger(timestampTrigger);

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        '&tokenAddrSell', '&eoa', '&amount',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '&tokenAddrSell', '$1',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '&tokenAddrSell',
            '&tokenAddrBuy',
            '$2',
            '%exchangeWrapper',
        ),
        '&proxy',
        '&eoa',
    );

    dcaStrategy.addAction(pullTokenAction);
    dcaStrategy.addAction(feeTakingAction);
    dcaStrategy.addAction(sellAction);

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

const createCompRepayStrategy = () => {
    const compBoostStrategy = new dfs.Strategy('CompBoostStrategy');
    compBoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const compRatioTrigger = new dfs.triggers.CompoundRatioTrigger('0', '0', '0');
    compBoostStrategy.addTrigger(compRatioTrigger);
    const compWithdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
        '%cETH',
        '%amount',
        '&proxy',
    );
    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '%wethAddr', '$1',
    );
    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%wethAddr',
            '%daiAddr',
            '$2',
            '%exchangeWrapper',
        ),
        '&proxy',
        '&proxy',
    );
    const paybackAction = new dfs.actions.compound.CompoundPaybackAction(
        '%cDai',
        '$3',
        '&proxy',
    );
    compBoostStrategy.addAction(compWithdrawAction);
    compBoostStrategy.addAction(feeTakingAction);
    compBoostStrategy.addAction(sellAction);
    compBoostStrategy.addAction(paybackAction);

    return compBoostStrategy.encodeForDsProxyCall();
};

const createBoostStrategy = () => {
    const compBoostStrategy = new dfs.Strategy('CompBoostStrategy');
    compBoostStrategy.addSubSlot('&targetRatio', 'uint256');

    const compRatioTrigger = new dfs.triggers.CompoundRatioTrigger('0', '0', '0');
    compBoostStrategy.addTrigger(compRatioTrigger);

    const compBorrowAction = new dfs.actions.compound.CompoundBorrowAction(
        '%assetToBorrow',
        '%amountToBorrow',
        '&proxy',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%assetBorrowed',
            '%assetWanted',
            '$1',
            '%wrapper',
        ),
        '&proxy',
        '&proxy',
    );

    const feeTakingAction = new dfs.actions.basic.GasFeeAction(
        '0', '%wethAddr', '$2',
    );

    const compSupplyAction = new dfs.actions.compound.CompoundSupplyAction(
        'cAssetToSupply',
        '$3',
        '&proxy',
        true,
    );
    compBoostStrategy.addAction(compBorrowAction);
    compBoostStrategy.addAction(sellAction);
    compBoostStrategy.addAction(feeTakingAction);
    compBoostStrategy.addAction(compSupplyAction);

    return compBoostStrategy.encodeForDsProxyCall();
};

const createMcdBoostStrategy = () => {
    const mcdBoostStrategy = new dfs.Strategy('MakerBoostStrategy');
    mcdBoostStrategy.addSubSlot('&vaultId', 'uint256');
    mcdBoostStrategy.addSubSlot('&targetRatio', 'uint256');

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
            '%daiAddr',
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

    const mcdRatioTrigger = new dfs.triggers.MakerRatioTrigger('0', '0', '0');
    mcdBoostStrategy.addTrigger(mcdRatioTrigger);

    const flAction = new dfs.actions.flashloan.DyDxFlashLoanAction('%amount', '%daiAddr');

    const ratioAction = new dfs.actions.maker.MakerRatioAction(
        '&vaultId',
    );

    const sellAction = new dfs.actions.basic.SellAction(
        formatExchangeObj(
            '%daiAddr',
            '%wethAddr',
            '%flAmountWeGotBack',
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
const handleSources = (strategy, isMultiSource) => {
    if (isMultiSource) {
        strategy.addSubSlot('&currSubId', 'uint256');
        strategy.addSubSlot('&numberOfSources', 'uint256');
        /*
        for (let i = 0; i < numberOfSources; i++) {
            strategy.addSubSlot(`&paybackSourceId${i}`, 'uint256');
            strategy.addSubSlot(`&paybackSourceType${i}`, 'uint256');
        }
        this isn't needed as we don't pipe those sources anywhere later on
        */
    } else {
        strategy.addSubSlot('&paybackSourceId', 'uint256');
        strategy.addSubSlot('&paybackSourceType', 'uint256');
    }
};

const createLiquityCloseChickenInStrategy = (isMultiSource = false) => {
    const strategy = new dfs.Strategy('LiquityCloseChickenInStrategy');
    handleSources(strategy, isMultiSource);
    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    strategy.addTrigger(liquityRatioTrigger);
    // const fetcBondIdAction = new dfs.actions
    const cbChickenInAction = new dfs.actions.chickenBonds.CBChickenInAction(

    );
    const sellAction = new dfs.actions.basic.SellAction(

    );
    const feeAction = new dfs.actions.basic.GasFeeAction(

    );
    const paybackAction = new dfs.actions.liquity.LiquityCloseAction(

    );
    const sendTokenAction = new dfs.actions.basic.SendTokenAction(

    );
    const sendETHAction = new dfs.actions.basic.SendTokenAndUnwrapAction(

    );
    // strategy.addAction(fetcBondIdAction);
    strategy.addAction(cbChickenInAction);
    strategy.addAction(sellAction);
    strategy.addAction(feeAction);
    strategy.addAction(paybackAction);
    strategy.addAction(sendTokenAction);
    strategy.addAction(sendETHAction);

    return strategy.encodeForDsProxyCall();
};

const createLiquityCloseChickenOutStrategy = (isMultiSource = false) => {
    const strategy = new dfs.Strategy('LiquityCloseChickenOutStrategy');
    handleSources(strategy, isMultiSource);
    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    strategy.addTrigger(liquityRatioTrigger);
    // const fetcBondIdAction = new dfs.actions
    const cbChickenOutAction = new dfs.actions.chickenBonds.CBChickenOutAction(

    );
    const feeAction = new dfs.actions.basic.GasFeeAction(

    );
    const paybackAction = new dfs.actions.liquity.LiquityCloseAction(

    );
    const sendTokenAction = new dfs.actions.basic.SendTokenAction(

    );
    const sendETHAction = new dfs.actions.basic.SendTokenAndUnwrapAction(

    );
    // strategy.addAction(fetcBondIdAction);
    strategy.addAction(cbChickenOutAction);
    strategy.addAction(feeAction);
    strategy.addAction(paybackAction);
    strategy.addAction(sendTokenAction);
    strategy.addAction(sendETHAction);

    return strategy.encodeForDsProxyCall();
};

const createLiquityPaybackChickenInStrategy = (isMultiSource = false) => {
    const strategy = new dfs.Strategy('LiquityPaybackChickenInStrategy');
    handleSources(strategy, isMultiSource);
    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    strategy.addTrigger(liquityRatioTrigger);

    // const fetcBondIdAction = new dfs.actions
    const cbChickenInAction = new dfs.actions.chickenBonds.CBChickenInAction(

    );
    const sellAction = new dfs.actions.basic.SellAction(

    );
    const feeAction = new dfs.actions.basic.GasFeeAction(

    );
    const paybackAction = new dfs.actions.liquity.LiquityPaybackAction(

    );
    const sendTokenAction = new dfs.actions.basic.SendTokenAction(

    );
    // strategy.addAction(fetcBondIdAction);
    strategy.addAction(cbChickenInAction);
    strategy.addAction(sellAction);
    strategy.addAction(feeAction);
    strategy.addAction(paybackAction);
    strategy.addAction(sendTokenAction);

    return strategy.encodeForDsProxyCall();
};

const createLiquityPaybackChickenOutStrategy = (isMultiSource = false) => {
    const strategy = new dfs.Strategy('LiquityPaybackChickenInStrategy');
    handleSources(strategy, isMultiSource);
    const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
    strategy.addTrigger(liquityRatioTrigger);
    // const fetcBondIdAction = new dfs.actions
    const cbChickenOutAction = new dfs.actions.chickenBonds.CBChickenOutAction(

    );
    const feeAction = new dfs.actions.basic.GasFeeAction(

    );
    const paybackAction = new dfs.actions.liquity.LiquityPaybackAction(

    );
    const sendTokenAction = new dfs.actions.basic.SendTokenAction(

    );
        // strategy.addAction(fetcBondIdAction);
    strategy.addAction(cbChickenOutAction);
    strategy.addAction(feeAction);
    strategy.addAction(paybackAction);
    strategy.addAction(sendTokenAction);

    return strategy.encodeForDsProxyCall();
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
    createLiquityBoostStrategy,
    createLiquityCloseToCollStrategy,
    createLimitOrderStrategy,
    createDCAStrategy,
    createContinuousUniV3CollectStrategy,
    createCompRepayStrategy,
    createBoostStrategy,
    createMcdBoostStrategy,
    createFlMcdBoostStrategy,
    createMcdCloseToCollStrategy,
    createCompV3RepayStrategy,
    createCompV3EOARepayStrategy,
    createFlCompV3RepayStrategy,
    createFlCompV3EOARepayStrategy,
    createCompV3BoostStrategy,
    createCompV3EOABoostStrategy,
    createCompV3FlBoostStrategy,
    createCbRebondStrategy,
    createCompV3EOAFlBoostStrategy,
    createLiquityCloseChickenInStrategy,
    createLiquityCloseChickenOutStrategy,
    createLiquityPaybackChickenInStrategy,
    createLiquityPaybackChickenOutStrategy,
};
