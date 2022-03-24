const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    depositToWeth,
    approve,
    balanceOf,
    timeTravel,
    openStrategyAndBundleStorage,
    getAddrFromRegistry,
    redeployCore,
    WETH_ADDRESS,
    DAI_ADDR,
} = require('../utils');

const { callDcaStrategy } = require('../strategy-calls');
const { subDcaStrategy } = require('../strategy-subs');
const { createDCAStrategy } = require('../strategies');

const { createStrategy, addBotCaller } = require('../utils-strategies');

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
    let subStorageAddr;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        strategyExecutor = await redeployCore();

        await redeploy('GasFeeTaker');
        await redeploy('DFSSell');
        await redeploy('TimestampTrigger');
        await redeploy('PullToken');

        subStorageAddr = getAddrFromRegistry('SubStorage');
        subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

        await addBotCaller(botAcc.address);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should make a new DCA Strategy for selling eth into dai', async () => {
        const strategyData = createDCAStrategy();
        await openStrategyAndBundleStorage();

        const strategyId = await createStrategy(proxy, ...strategyData, true);

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
            strategyId,
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

        const events = (await subStorage.queryFilter({
            address: subStorageAddr,
            topics: [
                hre.ethers.utils.id('UpdateData(uint256,bytes32,(uint64,bool,bytes[],bytes32[]))'),
            ],
        }));

        const lastEvent = events.at(-1);

        const abiCoder = hre.ethers.utils.defaultAbiCoder;
        strategySub = abiCoder.decode(['(uint64,bool,bytes[],bytes32[])'], lastEvent.data)[0];

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
