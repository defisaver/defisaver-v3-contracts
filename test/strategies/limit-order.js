const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    getChainLinkPrice,
    depositToWeth,
    approve,
    balanceOf,
    openStrategyAndBundleStorage,
    redeployCore,
    ETH_ADDR,
    WETH_ADDRESS,
    DAI_ADDR,
} = require('../utils');

const { callLimitOrderStrategy } = require('../strategy-calls');
const { subLimitOrderStrategy } = require('../strategy-subs');
const { createLimitOrderStrategy } = require('../strategies');

const { createStrategy, addBotCaller } = require('../utils-strategies.js');

describe('Limit-Order-Strategy', function () {
    this.timeout(120000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let subId;
    let strategySub;
    let amount;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        strategyExecutor = await redeployCore();

        await redeploy('GasFeeTaker');
        await redeploy('DFSSell');
        await redeploy('ChainLinkPriceTrigger');
        await redeploy('PullToken');

        await addBotCaller(botAcc.address);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should make a new Limit order strategy', async () => {
        const strategyData = createLimitOrderStrategy();
        await openStrategyAndBundleStorage();

        const strategyId = await createStrategy(proxy, ...strategyData, false);

        const currPrice = await getChainLinkPrice(ETH_ADDR);

        const targetPrice = currPrice - 100; // Target is smaller so we can execute it

        const tokenAddrSell = WETH_ADDRESS;
        const tokenAddrBuy = DAI_ADDR;

        amount = hre.ethers.utils.parseUnits('1', 18); // Sell 1 eth

        ({ subId, strategySub } = await subLimitOrderStrategy(
            proxy,
            senderAcc,
            tokenAddrSell,
            tokenAddrBuy,
            amount,
            targetPrice,
            strategyId,
        ));
    });

    it('... should trigger a limit order strategy', async () => {
        // get weth and approve dsproxy to pull
        await depositToWeth(amount.toString());
        await approve(WETH_ADDRESS, proxy.address);

        const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);

        await callLimitOrderStrategy(botAcc, senderAcc, strategyExecutor, subId, strategySub);

        const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
        const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

        expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        expect(wethBalanceBefore).to.be.gt(wethBalanceAfter);
    });

    it('... should fail to trigger the same strategy again as its one time', async () => {
        try {
            await depositToWeth(amount.toString());
            await callLimitOrderStrategy(botAcc, senderAcc, strategyExecutor, subId, strategySub);
        } catch (err) {
            expect(err.toString()).to.have.string('SubNotEnabled');
        }
    });
});
