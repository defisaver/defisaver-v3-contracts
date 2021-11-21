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

const { subLiquityRepayStrategy, callLiquityRepayStrategy, callLiquityFLRepayStrategy } = require('../strategies');

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

    const createLiquityRepayStrategy = () => {
        const liquityRepayStrategy = new dfs.Strategy('LiquityRepayStrategy');
        liquityRepayStrategy.addSubSlot('&targetRatio', 'uint256');

        const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
        liquityRepayStrategy.addTrigger(liquityRatioTrigger);

        const liquityWithdrawAction = new dfs.actions.liquity.LiquityWithdrawAction(
            '%withdrawAmount',
            '&proxy',
            '%upperHint',
            '%lowerHint',
        );

        const feeTakingAction = new dfs.actions.basic.GasFeeAction(
            '%repayGasCost', '%wethAddr', '$1',
        );

        const sellAction = new dfs.actions.basic.SellAction(
            formatExchangeObj(
                '%wethAddr',
                '%lusdAddr',
                '$2',
                '%wrapper',
            ),
            '&proxy',
            '&proxy',
        );

        const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
            '$3',
            '&proxy',
            '%upperHint',
            '%lowerHint',
        );

        liquityRepayStrategy.addAction(liquityWithdrawAction);
        liquityRepayStrategy.addAction(feeTakingAction);
        liquityRepayStrategy.addAction(sellAction);
        liquityRepayStrategy.addAction(liquityPaybackAction);

        return liquityRepayStrategy.encodeForDsProxyCall();
    };

    const createLiquityFLRepayStrategy = () => {
        const liquityFLRepayStrategy = new dfs.Strategy('LiquityFLRepayStrategy');
        liquityFLRepayStrategy.addSubSlot('&targetRatio', 'uint256');

        const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
        liquityFLRepayStrategy.addTrigger(liquityRatioTrigger);

        const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(['%wethAddr'], ['%repayAmount']);

        const feeTakingAction = new dfs.actions.basic.GasFeeAction(
            '%repayGasCost', '%wethAddr', '$1',
        );

        const sellAction = new dfs.actions.basic.SellAction(
            formatExchangeObj(
                '%wethAddr',
                '%lusdAddr',
                '$2',
                '%wrapper',
            ),
            '&proxy',
            '&proxy',
        );

        const liquityPaybackAction = new dfs.actions.liquity.LiquityPaybackAction(
            '$3',
            '&proxy',
            '%upperHint',
            '%lowerHint',
        );

        const liquityWithdrawAction = new dfs.actions.liquity.LiquityWithdrawAction(
            '$1',
            '%FLAddr',
            '%upperHint',
            '%lowerHint',
        );

        liquityFLRepayStrategy.addAction(flAction);
        liquityFLRepayStrategy.addAction(feeTakingAction);
        liquityFLRepayStrategy.addAction(sellAction);
        liquityFLRepayStrategy.addAction(liquityPaybackAction);
        liquityFLRepayStrategy.addAction(liquityWithdrawAction);

        return liquityFLRepayStrategy.encodeForDsProxyCall();
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

        await createStrategy(proxy, ...liquityRepayStrategy, true);
        await createStrategy(proxy, ...liquityFLRepayStrategy, true);

        await createBundle(proxy, [0, 1]);

        const ratioUnder = Float2BN('3');
        const targetRatio = Float2BN('3');

        // eslint-disable-next-line max-len
        ({ subId, strategySub } = await subLiquityRepayStrategy(proxy, ratioUnder, targetRatio));
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
