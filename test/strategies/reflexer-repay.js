const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    openStrategyAndBundleStorage,
    depositToWeth,
    redeployCore,
    send,
    WETH_ADDRESS,
    Float2BN,
} = require('../utils');

const { createStrategy, addBotCaller, createBundle } = require('../utils-strategies.js');

const { reflexerOpen, reflexerSupply, reflexerGenerate } = require('../actions');

const { ADAPTER_ADDRESS, lastSafeID, getRatio } = require('../utils-reflexer');

const { callReflexerRepayStrategy, callReflexerFLRepayStrategy } = require('../strategy-calls');
const { subReflexerRepayStrategy } = require('../strategy-subs');

const { createReflexerRepayStrategy, createReflexerFLRepayStrategy } = require('../strategies');

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

    const collAmount = Float2BN(fetchAmountinUSDPrice('WETH', '30000').toString());
    const debtAmount = Float2BN(fetchAmountinUSDPrice('RAI', '12000').toString());

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;
        botAcc = (await hre.ethers.getSigners())[1];

        balancerFL = await redeploy('FLBalancer');

        strategyExecutor = await redeployCore();

        await redeploy('DFSSell');
        await redeploy('GasFeeTaker');

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

        await openStrategyAndBundleStorage();

        const strategyId1 = await createStrategy(proxy, ...reflexerRepayStrategy, true);
        const strategyId2 = await createStrategy(proxy, ...reflexerFLRepayStrategy, true);

        const bundleId = await createBundle(proxy, [strategyId1, strategyId2]);

        const ratioUnder = Float2BN('2.8');
        const targetRatio = Float2BN('3');

        // eslint-disable-next-line max-len
        ({ subId, strategySub } = await subReflexerRepayStrategy(proxy, safeId, ratioUnder, targetRatio, bundleId));
    });

    it('... should trigger a Reflexer Repay strategy', async () => {
        const ratioBefore = await getRatio(safeId);
        const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', '1000').toString());

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
        const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', '1000').toString());

        // eslint-disable-next-line max-len
        await callReflexerFLRepayStrategy(botAcc, strategyExecutor, subId, strategySub, repayAmount, balancerFL.address);

        const ratioAfter = await getRatio(safeId);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.lt(ratioAfter);
    });
});
