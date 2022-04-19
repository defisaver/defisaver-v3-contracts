const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    openStrategyAndBundleStorage,
    Float2BN,
    depositToWeth,
    send,
    redeployCore,
    resetForkToBlock,
    WETH_ADDRESS,
} = require('../../utils');

const { createStrategy, addBotCaller, createBundle } = require('../../utils-strategies');

const { getRatio } = require('../../utils-liquity');

const {
    callLiquityBoostStrategy,
    callLiquityFLBoostStrategy,
    callLiquityFLRepayStrategy,
    callLiquityRepayStrategy,
} = require('../../strategy-calls');

const { subLiquityBoostStrategy, subLiquityRepayStrategy } = require('../../strategy-subs');

const {
    createLiquityBoostStrategy,
    createLiquityFLBoostStrategy,
    createLiquityRepayStrategy,
    createLiquityFLRepayStrategy,
} = require('../../strategies');

const { liquityOpen } = require('../../actions');

const liquityBoostStrategyTest = async () => {
    describe('Liquity-Boost-Bundle', function () {
        this.timeout(1200000);

        let balancerFL;

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let subId;
        let liquityView;
        let strategySub;

        const maxFeePercentage = Float2BN('5', 16);
        const collAmount = Float2BN(fetchAmountinUSDPrice('WETH', '30000'));

        before(async () => {
            await resetForkToBlock(14430140);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await hre.ethers.getSigners())[1];

            balancerFL = await redeploy('FLBalancer');
            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');
            strategyExecutor = await redeployCore();

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquitySupply');
            await redeploy('LiquityBorrow');
            await redeploy('LiquityRatioTrigger');

            await addBotCaller(botAcc.address);

            await depositToWeth(collAmount);
            await send(WETH_ADDRESS, proxyAddr, collAmount);

            await liquityOpen(
                proxy,
                maxFeePercentage,
                collAmount,
                Float2BN(fetchAmountinUSDPrice('LUSD', '12000')),
                proxyAddr,
                proxyAddr,
            );
        });

        it('... should make a Liquity Boost bundle and subscribe', async () => {
            const liquityBoostStrategy = createLiquityBoostStrategy();
            const liquityFLBoostStrategy = createLiquityFLBoostStrategy();

            await openStrategyAndBundleStorage();

            const strategyId1 = await createStrategy(proxy, ...liquityBoostStrategy, true);
            const strategyId2 = await createStrategy(proxy, ...liquityFLBoostStrategy, true);

            const bundleId = await createBundle(proxy, [strategyId1, strategyId2]);

            const ratioOver = Float2BN('1.8');
            const targetRatio = Float2BN('1.5');

            console.log(bundleId);

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subLiquityBoostStrategy(proxy, maxFeePercentage, ratioOver, targetRatio, bundleId));
        });

        it('... should trigger a Liquity Boost strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);

            const boostAmount = Float2BN(fetchAmountinUSDPrice('LUSD', '5000'));

            // eslint-disable-next-line max-len
            await callLiquityBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, proxyAddr);

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.gt(ratioAfter);
        });

        it('... should trigger a Liquity FL Boost strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
            const boostAmount = Float2BN(fetchAmountinUSDPrice('LUSD', '2000'));

            // eslint-disable-next-line max-len
            await callLiquityFLBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, proxyAddr, balancerFL.address);

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.gt(ratioAfter);
        });
    });
};

const liquityRepayStrategyTest = async () => {
    describe('Liquity-Repay-Bundle', function () {
        this.timeout(1200000);

        let balancerFL;

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let subId;
        let liquityView;
        let strategySub;

        const maxFeePercentage = Float2BN('5', 16);
        const collAmount = Float2BN(fetchAmountinUSDPrice('WETH', '30000'));

        before(async () => {
            await resetForkToBlock(14430140);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await hre.ethers.getSigners())[1];

            console.log(proxyAddr);

            strategyExecutor = await redeployCore();

            balancerFL = await redeploy('FLBalancer');

            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquityWithdraw');
            await redeploy('LiquityPayback');
            await redeploy('LiquityRatioTrigger');

            await addBotCaller(botAcc.address);

            await depositToWeth(collAmount);
            await send(WETH_ADDRESS, proxyAddr, collAmount);

            console.log('val: ', Float2BN(fetchAmountinUSDPrice('LUSD', '12000')));

            await liquityOpen(
                proxy,
                maxFeePercentage,
                collAmount,
                Float2BN(fetchAmountinUSDPrice('LUSD', '12000')),
                proxyAddr,
                proxyAddr,
            );
        });

        it('... should make a new Liquity Repay bundle and subscribe', async () => {
            const liquityRepayStrategy = createLiquityRepayStrategy();
            const liquityFLRepayStrategy = createLiquityFLRepayStrategy();

            await openStrategyAndBundleStorage();

            const strategyId1 = await createStrategy(proxy, ...liquityRepayStrategy, true);
            const strategyId2 = await createStrategy(proxy, ...liquityFLRepayStrategy, true);

            const bundleId = await createBundle(proxy, [strategyId1, strategyId2]);

            const ratioUnder = Float2BN('3');
            const targetRatio = Float2BN('3');

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subLiquityRepayStrategy(proxy, ratioUnder, targetRatio, bundleId));
        });

        it('... should trigger a Liquity Repay strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
            const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', '1000'));

            // eslint-disable-next-line max-len
            await callLiquityRepayStrategy(botAcc, strategyExecutor, subId, strategySub, repayAmount, proxyAddr);

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.lt(ratioAfter);
        });

        it('... should trigger a Liquity FL Repay strategy', async () => {
            const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
            const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', '1000'));

            // eslint-disable-next-line max-len
            await callLiquityFLRepayStrategy(botAcc, strategyExecutor, subId, strategySub, repayAmount, proxyAddr, balancerFL.address);

            const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

            console.log(
                `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
            );

            expect(ratioBefore).to.be.lt(ratioAfter);
        });
    });
};

const liquityStrategiesTest = async () => {
    await liquityBoostStrategyTest();
    await liquityRepayStrategyTest();
};
module.exports = {
    liquityStrategiesTest,
    liquityBoostStrategyTest,
    liquityRepayStrategyTest,
};
