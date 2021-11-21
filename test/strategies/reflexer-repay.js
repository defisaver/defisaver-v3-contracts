const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    formatExchangeObj,
    Float2BN,
    depositToWeth,
    send,
    WETH_ADDRESS,
} = require('../utils');

const { createStrategy, addBotCaller, createBundle } = require('../utils-strategies.js');

const { reflexerOpen, reflexerSupply, reflexerGenerate } = require('../actions');

const { ADAPTER_ADDRESS, lastSafeID, getRatio } = require('../utils-reflexer');

const { subReflexerRepayStrategy, callReflexerRepayStrategy, callReflexerFLRepayStrategy } = require('../strategies');

describe('Reflexer-Repay-Bundle', function () {
    this.timeout(1200000);

    let balancerFL;

    let senderAcc;
    let proxy;
    let proxyAddr;
    let botAcc;
    let strategyExecutor;
    let subId;
    let strategySub;
    let safeId;

    const collAmount = Float2BN(fetchAmountinUSDPrice('WETH', '30000'));
    const debtAmount = Float2BN(fetchAmountinUSDPrice('RAI', '12000'));

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

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;
        botAcc = (await hre.ethers.getSigners())[1];

        balancerFL = await redeploy('FLBalancer');

        await redeploy('BotAuth');
        await redeploy('ProxyAuth');
        await redeploy('DFSSell');
        await redeploy('StrategyStorage');
        await redeploy('BundleStorage');
        await redeploy('SubStorage');
        await redeploy('SubProxy');
        await redeploy('StrategyProxy');
        await redeploy('RecipeExecutor');
        await redeploy('GasFeeTaker');
        strategyExecutor = await redeploy('StrategyExecutor');

        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerGenerate');
        await redeploy('ReflexerWithdraw');
        await redeploy('ReflexerPayback');
        await redeploy('ReflexerRatioTrigger');

        await addBotCaller(botAcc.address);

        await depositToWeth(collAmount);
        await send(WETH_ADDRESS, proxyAddr, collAmount);

        await reflexerOpen(proxy, ADAPTER_ADDRESS);
        safeId = await lastSafeID(proxy.address);
        await reflexerSupply(proxy, safeId, collAmount, ADAPTER_ADDRESS, proxyAddr);
        await reflexerGenerate(proxy, safeId, debtAmount, proxyAddr);
    });

    it('... should make a Reflexer Repay bundle and subscribe', async () => {
        const reflexerRepayStrategy = createReflexerRepayStrategy();
        const reflexerFLRepayStrategy = createReflexerFLRepayStrategy();

        await createStrategy(proxy, ...reflexerRepayStrategy, true);
        await createStrategy(proxy, ...reflexerFLRepayStrategy, true);

        await createBundle(proxy, [0, 1]);

        const ratioUnder = Float2BN('2.8');
        const targetRatio = Float2BN('3');

        // eslint-disable-next-line max-len
        ({ subId, strategySub } = await subReflexerRepayStrategy(proxy, safeId, ratioUnder, targetRatio));
    });

    it('... should trigger a Reflexer Repay strategy', async () => {
        const ratioBefore = await getRatio(safeId);
        const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', '1000'));

        // eslint-disable-next-line max-len
        await callReflexerRepayStrategy(botAcc, strategyExecutor, subId, strategySub, repayAmount);

        const ratioAfter = await getRatio(safeId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.lt(ratioAfter);
    });

    it('... should trigger a Reflexer FL Repay strategy', async () => {
        const ratioBefore = await getRatio(safeId);
        const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', '1000'));

        // eslint-disable-next-line max-len
        await callReflexerFLRepayStrategy(botAcc, strategyExecutor, subId, strategySub, repayAmount, balancerFL.address);

        const ratioAfter = await getRatio(safeId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.lt(ratioAfter);
    });
});
