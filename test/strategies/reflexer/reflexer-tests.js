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
} = require('../../utils');

const { createStrategy, addBotCaller, createBundle } = require('../../utils-strategies');

const { reflexerOpen, reflexerSupply, reflexerGenerate } = require('../../actions');

const { ADAPTER_ADDRESS, lastSafeID, getRatio } = require('../../utils-reflexer');

const {
    callReflexerRepayStrategy,
    callReflexerFLRepayStrategy,
    callReflexerFLBoostStrategy,
    callReflexerBoostStrategy,
} = require('../../strategy-calls');

const { subReflexerRepayStrategy, subReflexerBoostStrategy } = require('../../strategy-subs');

const {
    createReflexerRepayStrategy,
    createReflexerFLRepayStrategy,
    createReflexerBoostStrategy,
    createReflexerFLBoostStrategy,
} = require('../../strategies');

const reflexerRepayStrategyTest = async () => {
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
};

const reflexerBoostStrategyTest = async () => {
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

        const collAmount = Float2BN(fetchAmountinUSDPrice('WETH', '30000').toString());
        const debtAmount = Float2BN(fetchAmountinUSDPrice('RAI', '12000').toString());

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutor = await redeployCore();

            aaveFL = await redeploy('FLAaveV2');

            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');

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

            await openStrategyAndBundleStorage();

            const strategyId1 = await createStrategy(proxy, ...reflexerBoostStrategy, true);
            const strategyId2 = await createStrategy(proxy, ...reflexerFLBoostStrategy, true);

            const bundleId = await createBundle(proxy, [strategyId1, strategyId2]);

            const ratioOver = Float2BN('2.2');
            const targetRatio = Float2BN('1.5');

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subReflexerBoostStrategy(proxy, safeId, ratioOver, targetRatio, bundleId));
        });

        it('... should trigger a Reflexer Boost strategy', async () => {
            const ratioBefore = await getRatio(safeId);
            const boostAmount = Float2BN(fetchAmountinUSDPrice('RAI', '1000').toString());

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
            const boostAmount = Float2BN(fetchAmountinUSDPrice('RAI', '1000').toString());

            // eslint-disable-next-line max-len
            await callReflexerFLBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, aaveFL.address);

            const ratioAfter = await getRatio(safeId);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.gt(ratioAfter);
        });
    });
};

const reflexerStrategiesTest = async () => {
    await reflexerRepayStrategyTest();
    await reflexerBoostStrategyTest();
};
module.exports = {
    reflexerStrategiesTest,
    reflexerRepayStrategyTest,
    reflexerBoostStrategyTest,
};
