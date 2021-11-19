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
    nullAddress,
} = require('../utils');

const { createStrategy, addBotCaller, createBundle } = require('../utils-strategies.js');

const { subReflexerBoostStrategy, callReflexerBoostStrategy, callReflexerFLBoostStrategy } = require('../strategies');

const { reflexerOpen, reflexerSupply, reflexerGenerate } = require('../actions');

const { ADAPTER_ADDRESS, lastSafeID, getRatio } = require('../utils-reflexer');

describe('Reflexer-Boost-Bundle', function () {
    this.timeout(1200000);

    let aaveFL;

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

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;
        botAcc = (await hre.ethers.getSigners())[1];

        aaveFL = await redeploy('FLAaveV2');

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
        await redeploy('ReflexerRatioTrigger');

        await addBotCaller(botAcc.address);

        await depositToWeth(collAmount);
        await send(WETH_ADDRESS, proxyAddr, collAmount);

        await reflexerOpen(proxy, ADAPTER_ADDRESS);
        safeId = await lastSafeID(proxy.address);
        await reflexerSupply(proxy, safeId, collAmount, ADAPTER_ADDRESS, proxyAddr);
        await reflexerGenerate(proxy, safeId, debtAmount, proxyAddr);
    });

    it('... should make a Reflexer Boost bundle and subscribe', async () => {
        const reflexerBoostStrategy = createReflexerBoostStrategy();
        const reflexerFLBoostStrategy = createReflexerFLBoostStrategy();

        await createStrategy(proxy, ...reflexerBoostStrategy, true);
        await createStrategy(proxy, ...reflexerFLBoostStrategy, true);

        await createBundle(proxy, [0, 1]);

        const ratioOver = Float2BN('2.2');
        const targetRatio = Float2BN('1.5');

        // eslint-disable-next-line max-len
        ({ subId, strategySub } = await subReflexerBoostStrategy(proxy, safeId, ratioOver, targetRatio));
    });

    it('... should trigger a Reflexer Boost strategy', async () => {
        const ratioBefore = await getRatio(safeId);
        const boostAmount = Float2BN(fetchAmountinUSDPrice('RAI', '1000'));

        // eslint-disable-next-line max-len
        await callReflexerBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount);

        const ratioAfter = await getRatio(safeId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.gt(ratioAfter);
    });

    it('... should trigger a Reflexer FL Boost strategy', async () => {
        const ratioBefore = await getRatio(safeId);
        const boostAmount = Float2BN(fetchAmountinUSDPrice('RAI', '1000'));

        // eslint-disable-next-line max-len
        await callReflexerFLBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, aaveFL.address);

        const ratioAfter = await getRatio(safeId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.gt(ratioAfter);
    });
});
