const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const {
    getProxy,
    redeploy,
    formatExchangeObj,
    depositToWeth,
    approve,
    balanceOf,
    timeTravel,
    WETH_ADDRESS,
    DAI_ADDR,
    Float2BN,
} = require('../utils');

const { subDcaStrategy, callDcaStrategy } = require('../strategies');

const { createStrategy, addBotCaller } = require('../utils-strategies.js');

const TWO_DAYS = 2 * 24 * 60 * 60;
const START_TIMESTAMP = 1630489138;

// TESTED FROM BLOCK: 13146320

// Convert ETH -> DAI, every N Days
describe('DCA Strategy', function () {
    this.timeout(120000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let subId;
    let strategySub;
    let amount;
    let subStorage;
    let lastTimestamp;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        await redeploy('ProxyAuth');
        await redeploy('BotAuth');
        await redeploy('StrategyStorage');
        subStorage = await redeploy('SubStorage');
        await redeploy('RecipeExecutor');
        await redeploy('GasFeeTaker');
        await redeploy('DFSSell');
        await redeploy('SubProxy');
        await redeploy('TimestampTrigger');
        await redeploy('StrategyProxy');
        await redeploy('PullToken');

        strategyExecutor = await redeploy('StrategyExecutor');

        await addBotCaller(botAcc.address);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should make a new DCA Strategy for selling eth into dai', async () => {
        const dcaStrategy = new dfs.Strategy('DCAStrategy');
        dcaStrategy.addSubSlot('&tokenAddrSell', 'address');
        dcaStrategy.addSubSlot('&tokenAddrBuy', 'address');
        dcaStrategy.addSubSlot('&amount', 'uint256');
        dcaStrategy.addSubSlot('&interval', 'uint256');
        dcaStrategy.addSubSlot('&lastTimestamp', 'uint256');
        dcaStrategy.addSubSlot('&proxy', 'address');
        dcaStrategy.addSubSlot('&eoa', 'address');

        const timestampTrigger = new dfs.triggers.TimestampTrigger('0');
        dcaStrategy.addTrigger(timestampTrigger);

        const pullTokenAction = new dfs.actions.basic.PullTokenAction(
            '&tokenAddrSell', '&eoa', '&amount',
        );

        const feeTakingAction = new dfs.actions.basic.GasFeeAction(
            '0', '&tokenAddrSell', '$1',
        );

        const sellAction = new dfs.actions.basic.SellAction(
            formatExchangeObj(
                '&tokenAddrSell',
                '&tokenAddrBuy',
                '$2',
                '%exchangeWrapper',
            ),
            '&proxy',
            '&eoa',
        );

        dcaStrategy.addAction(pullTokenAction);
        dcaStrategy.addAction(feeTakingAction);
        dcaStrategy.addAction(sellAction);

        const callData = dcaStrategy.encodeForDsProxyCall();

        await createStrategy(proxy, ...callData, true);

        const tokenAddrSell = WETH_ADDRESS;
        const tokenAddrBuy = DAI_ADDR;

        const interval = TWO_DAYS;
        lastTimestamp = START_TIMESTAMP;

        amount = hre.ethers.utils.parseUnits('1', 18); // Sell 1 eth

        ({ subId, strategySub } = await subDcaStrategy(
            proxy,
            tokenAddrSell,
            tokenAddrBuy,
            amount,
            interval,
            lastTimestamp,
            senderAcc.address,
        ));
    });

    it('... should trigger DCA strategy', async () => {
        // get weth and approve dsproxy to pull
        await depositToWeth(amount.toString());
        await approve(WETH_ADDRESS, proxy.address);

        const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);

        const newTimestamp = lastTimestamp + TWO_DAYS;

        // eslint-disable-next-line max-len
        await callDcaStrategy(botAcc, strategyExecutor, subId, strategySub, subStorage.address, newTimestamp);

        const eventFilter = subStorage.filters.UpdateData(Float2BN(subId));
        const event = (await subStorage.queryFilter(eventFilter)).at(-1);

        const abiCoder = hre.ethers.utils.defaultAbiCoder;
        strategySub = abiCoder.decode(['(uint64,bool,bytes[],bytes32[])'], event.data)[0];

        const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
        const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

        expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        expect(wethBalanceBefore).to.be.gt(wethBalanceAfter);
    });

    it('... should trigger DCA strategy again after 2 days', async () => {
        await timeTravel(TWO_DAYS);
        // get weth and approve dsproxy to pull
        await depositToWeth(amount.toString());
        await approve(WETH_ADDRESS, proxy.address);

        const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);

        const newTimestamp = lastTimestamp + TWO_DAYS;

        // eslint-disable-next-line max-len
        await callDcaStrategy(botAcc, strategyExecutor, subId, strategySub, subStorage.address, newTimestamp);

        const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
        const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

        expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        expect(wethBalanceBefore).to.be.gt(wethBalanceAfter);
    });
});
