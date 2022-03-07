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
    WETH_ADDRESS,
} = require('../utils');

const { createStrategy, addBotCaller, createBundle } = require('../utils-strategies.js');

const { getRatio } = require('../utils-liquity.js');

const { callLiquityBoostStrategy, callLiquityFLBoostStrategy } = require('../strategy-calls');
const { subLiquityBoostStrategy } = require('../strategy-subs');
const { createLiquityBoostStrategy, createLiquityFLBoostStrategy } = require('../strategies');

const { liquityOpen } = require('../actions');

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
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;
        botAcc = (await hre.ethers.getSigners())[1];

        balancerFL = await redeploy('FLBalancer');
        await redeploy('DFSSell');
        await redeploy('GasFeeTaker');
        strategyExecutor = await redeploy('StrategyExecutor');

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
        // const liquityFLBoostStrategy = createLiquityFLBoostStrategy();

        // await openStrategyAndBundleStorage();

        // const strategyId1 = await createStrategy(proxy, ...liquityBoostStrategy, true);
        // const strategyId2 = await createStrategy(proxy, ...liquityFLBoostStrategy, true);

        // const bundleId = await createBundle(proxy, [strategyId1, strategyId2]);

        // const ratioOver = Float2BN('1.8');
        // const targetRatio = Float2BN('1.5');

        // console.log(bundleId);

        // // eslint-disable-next-line max-len
        // ({ subId, strategySub } = await subLiquityBoostStrategy(proxy, maxFeePercentage, ratioOver, targetRatio, bundleId));
    });

    // it('... should trigger a Liquity Boost strategy', async () => {
    //     const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);

    //     console.log(ratioBefore.toString());
    //     const boostAmount = Float2BN(fetchAmountinUSDPrice('LUSD', '5000'));

    //     // eslint-disable-next-line max-len
    //     await callLiquityBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, proxyAddr);

    //     const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

    //     console.log(
    //         `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
    //     );

    //     expect(ratioBefore).to.be.gt(ratioAfter);
    // });

    // it('... should trigger a Liquity FL Boost strategy', async () => {
    //     const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
    //     const boostAmount = Float2BN(fetchAmountinUSDPrice('LUSD', '5000'));

    //     // eslint-disable-next-line max-len
    //     await callLiquityFLBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, proxyAddr, balancerFL.address);

    //     const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

    //     console.log(
    //         `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
    //     );

    //     expect(ratioBefore).to.be.gt(ratioAfter);
    // });
});
