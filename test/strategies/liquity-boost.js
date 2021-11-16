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

const { subLiquityBoostStrategy, callLiquityBoostStrategy } = require('../strategies');

const { liquityOpen } = require('../actions');

describe('Liquity-Boost-Strategy', function () {
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

    it('... should make a new Liquity Boost strategy and subscribe twice', async () => {
        const liquityBoostStrategy = new dfs.Strategy('LiquityBoostStrategy');
        liquityBoostStrategy.addSubSlot('&maxFeePercentage', 'uint256');
        liquityBoostStrategy.addSubSlot('&targetRatio', 'uint256');

        const liquityRatioTrigger = new dfs.triggers.LiquityRatioTrigger('0', '0', '0');
        liquityBoostStrategy.addTrigger(liquityRatioTrigger);

        const liquityBorrowAction = new dfs.actions.liquity.LiquityBorrowAction(
            '&maxFeePercentage',
            '%borrowAmount',
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

        const callData = liquityBoostStrategy.encodeForDsProxyCall();

        await createStrategy(proxy, ...callData, true);

        const ratioOver = Float2BN('2.4');
        const targetRatio = Float2BN('2');

        // eslint-disable-next-line max-len
        ({ subId, strategySub } = await subLiquityBoostStrategy(proxy, 0, false, maxFeePercentage, ratioOver, targetRatio));
        // eslint-disable-next-line max-len
        ({ subId, strategySub } = await subLiquityBoostStrategy(proxy, 0, false, maxFeePercentage, ratioOver, targetRatio));
    });

    it('... should trigger a Liquity Boost strategy', async () => {
        const { ratio: ratioBefore } = await getRatio(liquityView, proxyAddr);
        const boostAmount = Float2BN(fetchAmountinUSDPrice('LUSD', '5000'));

        // eslint-disable-next-line max-len
        await callLiquityBoostStrategy(botAcc, strategyExecutor, subId, boostAmount, proxyAddr, strategySub);

        const { ratio: ratioAfter } = await getRatio(liquityView, proxyAddr);

        console.log(
            `Ratio before ${ratioBefore.toString()} -> Ratio after: ${ratioAfter.toString()}`,
        );

        expect(ratioBefore).to.be.gt(ratioAfter);
    });
});
