const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    redeployCore,
    openStrategyAndBundleStorage,
    setBalance,
    LUSD_ADDR,
    timeTravel,
} = require('../../utils');

const { createChickenBond } = require('../../actions');

const { createStrategy, addBotCaller } = require('../../utils-strategies');

const {
    createCbRebondStrategy,
} = require('../../strategies');

const { callCbRebondStrategy } = require('../../strategy-calls');
const { subCbRebondStrategy } = require('../../strategy-subs');

const cbRebondStrategyTest = async () => {
    describe('Chicken-Bond-Rebond-Strategy', function () {
        this.timeout(1200000);

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutor;
        let subId;
        let strategySub;
        let chickenBondsView;
        let bondID;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutor = await redeployCore();

            chickenBondsView = await redeploy('ChickenBondsView');
            await redeploy('CBRebondTrigger');
            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');
            await redeploy('CBCreate');
            await redeploy('CBChickenIn');

            await addBotCaller(botAcc.address);

            const lusdAmount = hre.ethers.utils.parseUnits('1000', 18);
            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmount);

            await createChickenBond(proxy, lusdAmount, senderAcc.address);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondID = bonds[bonds.length - 1].bondID.toString();
        });

        it('... should make a Chicken Bond Rebond strategy and subscribe', async () => {
            const cbRebondStrategy = createCbRebondStrategy();

            await openStrategyAndBundleStorage();

            const strategyId = await createStrategy(proxy, ...cbRebondStrategy, true);

            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subCbRebondStrategy(proxy, bondID, strategyId));
        });

        it('... should trigger a Chicken Bond rebond strategy', async () => {
            await timeTravel(10 * 24 * 60 * 60); // TODO: make it variable

            await callCbRebondStrategy(botAcc, strategyExecutor, subId, strategySub);
        });
    });
};

const cbStrategiesTest = async () => {
    await cbRebondStrategyTest();
};
module.exports = {
    cbStrategiesTest,
    cbRebondStrategyTest,
};
