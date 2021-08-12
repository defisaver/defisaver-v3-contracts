const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    getProxy, redeploy, fetchAmountinUSDPrice, formatExchangeObj,
} = require('../utils');


describe('Limit-Order-Strategy', function () {
    this.timeout(120000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        await redeploy('BotAuth');
        await redeploy('ProxyAuth');
        // await redeploy('Subscriptions');
        await redeploy('SubscriptionProxy');
        await redeploy('RecipeExecutor');
        await redeploy('GasFeeTaker');
        strategyExecutor = await redeploy('StrategyExecutor');

        await addBotCaller(botAcc.address);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should make a new Limit order strategy', async () => {
        // if price is  >= X
        // preform Y -> Z trade (add extra check here)
    });

});