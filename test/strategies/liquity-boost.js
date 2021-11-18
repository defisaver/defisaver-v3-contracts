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

const { getRatio } = require('../utils-liquity.js');

const { subLiquityBoostStrategy, callLiquityBoostStrategy, callLiquityFLBoostStrategy } = require('../strategies');

const { liquityOpen } = require('../actions');

describe('Liquity-Boost-Strategy', function () {
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

        await createStrategy(proxy, ...liquityBoostStrategy, true);
        await createStrategy(proxy, ...liquityFLBoostStrategy, true);

        await createBundle(proxy, [0, 1]);

        const ratioOver = Float2BN('2');
        const targetRatio = Float2BN('1.5');

        // eslint-disable-next-line max-len
        ({ subId, strategySub } = await subLiquityBoostStrategy(proxy, maxFeePercentage, ratioOver, targetRatio));
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
        const boostAmount = Float2BN(fetchAmountinUSDPrice('LUSD', '5000'));

        // eslint-disable-next-line max-len
        await callLiquityFLBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount, proxyAddr, balancerFL.address);

        const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.gt(ratioAfter);
    });
});