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

const { getRatio } = require('../utils-liquity.js');

const { subLiquityRepayStrategy, callLiquityRepayStrategy } = require('../strategies');

const { liquityOpen } = require('../actions');

describe('Liquity-Repay-Strategy', function () {
    this.timeout(1200000);

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

    it('... should make a new Liquity Repay strategy and subcsribe twice', async () => {
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

        const callData = liquityRepayStrategy.encodeForDsProxyCall();

        await createStrategy(proxy, ...callData, true);

        const ratioUnder = Float2BN('2.6');
        const targetRatio = Float2BN('3');

        // eslint-disable-next-line max-len
        ({ subId, strategySub } = await subLiquityRepayStrategy(proxy, ratioUnder, targetRatio));
        // eslint-disable-next-line max-len
        ({ subId, strategySub } = await subLiquityRepayStrategy(proxy, ratioUnder, targetRatio));
    });

    it('... should trigger a Liquity Repay strategy', async () => {
        const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
        const repayAmount = Float2BN(fetchAmountinUSDPrice('WETH', '3500'));

        // eslint-disable-next-line max-len
        await callLiquityRepayStrategy(botAcc, strategyExecutor, subId, strategySub, repayAmount, proxyAddr);

        const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.lt(ratioAfter);
    });
});
