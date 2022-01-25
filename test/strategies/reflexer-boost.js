const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    Float2BN,
    depositToWeth,
    send,
    WETH_ADDRESS,
} = require('../utils');

const { createStrategy, addBotCaller, createBundle } = require('../utils-strategies.js');

const { callReflexerBoostStrategy, callReflexerFLBoostStrategy } = require('../strategy-calls');
const { subReflexerBoostStrategy } = require('../strategy-subs');
const { createReflexerBoostStrategy, createReflexerFLBoostStrategy } = require('../strategies');

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
