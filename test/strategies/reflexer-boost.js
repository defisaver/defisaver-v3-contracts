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

const { createStrategy, addBotCaller } = require('../utils-strategies.js');

const { subReflexerBoostStrategy, callReflexerBoostStrategy } = require('../strategies');

const { reflexerOpen, reflexerSupply, reflexerGenerate } = require('../actions');

const { ADAPTER_ADDRESS, lastSafeID, getRatio } = require('../utils-reflexer');

describe('Reflexer-Boost-Strategy', function () {
    this.timeout(1200000);

    let senderAcc;
    let proxy;
    let proxyAddr;
    let botAcc;
    let strategyExecutor;
    let strategyId;
    let safeId;

    const collAmount = Float2BN(fetchAmountinUSDPrice('WETH', '30000'));
    const debtAmount = Float2BN(fetchAmountinUSDPrice('RAI', '12000'));

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;
        botAcc = (await hre.ethers.getSigners())[1];

        await redeploy('BotAuth');
        await redeploy('ProxyAuth');
        await redeploy('DFSSell');
        await redeploy('StrategyStorage');
        await redeploy('SubStorage');
        await redeploy('SubProxy');
        await redeploy('StrategyProxy');
        await redeploy('RecipeExecutor');
        await redeploy('GasFeeTaker');
        strategyExecutor = await redeploy('StrategyExecutor');

        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerGenerate');
        await redeploy('ReflexerRatioTrigger');

        await addBotCaller(botAcc.address);

        await depositToWeth(collAmount);
        await send(WETH_ADDRESS, proxyAddr, collAmount);

        await reflexerOpen(proxy, ADAPTER_ADDRESS);
        safeId = await lastSafeID(proxy.address);
        await reflexerSupply(proxy, safeId, collAmount, ADAPTER_ADDRESS, proxyAddr);
        await reflexerGenerate(proxy, safeId, debtAmount, proxyAddr);
    });

    it('... should make a new Reflexer Boost strategy', async () => {
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

        const callData = reflexerBoostStrategy.encodeForDsProxyCall();

        await createStrategy(proxy, ...callData, true);

        const ratioOver = Float2BN('2.2');
        const targetRatio = Float2BN('2');

        // eslint-disable-next-line max-len
        strategyId = await subReflexerBoostStrategy(proxy, safeId, ratioOver, targetRatio);
    });

    it('... should trigger a Reflexer Boost strategy', async () => {
        const ratioBefore = await getRatio(safeId);
        const boostAmount = Float2BN(fetchAmountinUSDPrice('RAI', '5000'));

        // eslint-disable-next-line max-len
        await callReflexerBoostStrategy(botAcc, strategyExecutor, strategyId, boostAmount, proxyAddr);

        const ratioAfter = await getRatio(safeId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.gt(ratioAfter);
    });
});
