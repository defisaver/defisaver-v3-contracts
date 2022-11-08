/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');

const {
    getProxy,
    redeploy,
    redeployCore,
    openStrategyAndBundleStorage,
    setBalance,
    timeTravel,
    setNewExchangeWrapper,
    LUSD_ADDR,
    BLUSD_ADDR,
} = require('../../utils');

const {
    getRebondTime,
} = require('../../utils-cb');

const { createChickenBond } = require('../../actions');

const { createStrategy, addBotCaller } = require('../../utils-strategies');

const {
    createCbRebondStrategy,
} = require('../../strategies');

const { callCbRebondStrategy } = require('../../strategy-calls');
const { subCbRebondStrategy } = require('../../strategy-subs');

const { createCbRebondTrigger } = require('../../triggers');

const cbRebondStrategyTest = async () => {
    describe('Chicken-Bond-Rebond-Strategy', function () {
        this.timeout(1200000);

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let strategySub;
        let chickenBondsView;
        let bondID;
        let bondIDNew;
        let rebondTrigger;
        let lusdAmountWei;
        let newLusdAmount;
        const strategyId = '31';

        const lusdAmount = '50000';

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutor = await redeployCore();

            chickenBondsView = await redeploy('ChickenBondsView');
            rebondTrigger = await redeploy('CBRebondTrigger');
            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');
            await redeploy('CBCreate');
            await redeploy('CBChickenIn');
            await redeploy('CBRebondSubProxy');
            await redeploy('CBUpdateRebondSub');

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            await addBotCaller(botAcc.address);

            lusdAmountWei = hre.ethers.utils.parseUnits(lusdAmount, 18);
            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmountWei);

            await createChickenBond(proxy, lusdAmountWei, senderAcc.address);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondID = bonds[bonds.length - 1].bondID.toString();
        });

        it('... should make a Chicken Bond Rebond strategy and subscribe', async () => {
            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subCbRebondStrategy(proxy, bondID, strategyId));
        });

        it('... should trigger a Chicken Bond rebond strategy', async () => {
            const time = await getRebondTime(chickenBondsView, rebondTrigger, lusdAmount);

            await timeTravel(time);

            await callCbRebondStrategy(botAcc, strategyExecutor, subId, strategySub);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondIDNew = bonds[bonds.length - 1].bondID.toString();

            newLusdAmount = hre.ethers.utils.formatUnits(bonds[bonds.length - 1].lusdAmount, 18);

            expect(bonds[bonds.length - 1].lusdAmount).to.be.gt(lusdAmountWei);
            expect(+bondIDNew).to.be.eq(+bondID + 1);
            console.log(bondIDNew, bondID);
        });

        it('... should rebond again for the new bondId', async () => {
            const abiCoder = new hre.ethers.utils.AbiCoder();

            const time = await getRebondTime(chickenBondsView, rebondTrigger, newLusdAmount);

            const triggerData = await createCbRebondTrigger(bondIDNew);

            const subIdEncoded = abiCoder.encode(['uint256'], [subId.toString()]);
            const bondIDNewEncoded = abiCoder.encode(['uint256'], [bondIDNew.toString()]);
            const bLusdTokenEncoded = abiCoder.encode(['address'], [BLUSD_ADDR]);
            const lusdTokenEncoded = abiCoder.encode(['address'], [LUSD_ADDR]);
            strategySub = [strategyId, false,
                [triggerData], [subIdEncoded, bondIDNewEncoded, bLusdTokenEncoded, lusdTokenEncoded]];

            await timeTravel(time);

            await callCbRebondStrategy(botAcc, strategyExecutor, subId, strategySub);

            const newLusdAmountWei = hre.ethers.utils.parseUnits(newLusdAmount, 18);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondIDNew = bonds[bonds.length - 1].bondID.toString();

            expect(bonds[bonds.length - 1].lusdAmount).to.be.gt(newLusdAmountWei);
            expect(+bondIDNew).to.be.eq(+bondID + 2);
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
