const dfs = require('@defisaver/sdk');

const {
    formatExchangeObj,
    nullAddress,
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

const createMcdCloseStrategy = () => {
    const mcdCloseStrategy = new dfs.Strategy('McdCloseToDaiStrategy');
    mcdCloseStrategy.addSubSlot('&vaultId', 'uint256');
    mcdCloseStrategy.addSubSlot('&daiAddr', 'address');
    mcdCloseStrategy.addSubSlot('&mcdManager', 'address');

    const chainLinkPriceTrigger = new dfs.triggers.ChainLinkPriceTrigger(nullAddress, '0', '0');
    mcdCloseStrategy.addTrigger(chainLinkPriceTrigger);
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

    const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(['%lusdAddr'], ['%boostAmount']);

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

    const liquityBorrowAction = new dfs.actions.liquity.LiquityBorrowAction(
        '&maxFeePercentage',
        '$1',
        '%FLAddr',
        '%upperHint',
        '%lowerHint',
    );

    liquityFLBoostStrategy.addAction(flAction);
    liquityFLBoostStrategy.addAction(sellAction);
    liquityFLBoostStrategy.addAction(feeTakingAction);
    liquityFLBoostStrategy.addAction(liquitySupplyAction);
    liquityFLBoostStrategy.addAction(liquityBorrowAction);

    return liquityFLBoostStrategy.encodeForDsProxyCall();
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
    createMcdCloseStrategy,
    createLiquityRepayStrategy,
    createLiquityFLRepayStrategy,
    createLiquityFLBoostStrategy,
    createLiquityBoostStrategy,
    createLimitOrderStrategy,
    createDCAStrategy,
    createContinuousUniV3CollectStrategy,
    createCompRepayStrategy,
    createBoostStrategy,
    createMcdBoostStrategy,
    createFlMcdBoostStrategy,
};
