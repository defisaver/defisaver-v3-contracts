const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    fetchAmountinUSDPrice,
    openStrategyAndBundleStorage,
    redeployCore,
    depositToWeth,
    send,
    Float2BN,
    WETH_ADDRESS,
} = require('../utils');

const { createStrategy, addBotCaller, createBundle } = require('../utils-strategies.js');

const { getRatio } = require('../utils-liquity.js');

const { callLiquityRepayStrategy, callLiquityFLRepayStrategy } = require('../strategy-calls');
const { subLiquityRepayStrategy } = require('../strategy-subs');
const { createLiquityRepayStrategy, createLiquityFLRepayStrategy } = require('../strategies');

const { liquityOpen } = require('../actions');

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
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;
        botAcc = (await hre.ethers.getSigners())[1];

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
