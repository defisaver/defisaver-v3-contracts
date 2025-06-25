/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');
const automationSdk = require('@defisaver/automation-sdk');

const {
    getProxy,
    redeploy,
    redeployCore,
    setBalance,
    timeTravel,
    setNewExchangeWrapper,
    LUSD_ADDR,
    BLUSD_ADDR,
    addrs,
    setContractAt,
    resetForkToBlock,
} = require('../../utils/utils');

const {
    getRebondTime,
} = require('../../utils/cb');

const { createChickenBond } = require('../../utils/actions');

const { addBotCaller } = require('../utils/utils-strategies');

const { callCbRebondStrategy } = require('../utils/strategy-calls');
const { subCbRebondStrategy } = require('../utils/strategy-subs');

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
        let newLusdAmount = 0;
        let smallBondId;
        let smallBondSubId;
        let smallBondStrategySub;

        const strategyId = '31';

        const lusdAmount = '50000';
        const smallLusdAmount = '1000';

        before(async () => {
            // safe factory not deployed this far back
            if (!hre.config.isWalletSafe) {
                await resetForkToBlock(16313631); // for rebonding to work
            }

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
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

            await setContractAt({ name: 'WrapperExchangeRegistry', address: addrs.mainnet.WRAPPER_EXCHANGE_REGISTRY });

            const { address: mockWrapperAddr } = await redeploy('MockExchangeWrapper');

            await setNewExchangeWrapper(senderAcc, mockWrapperAddr);

            await addBotCaller(botAcc.address);

            lusdAmountWei = hre.ethers.utils.parseUnits(smallLusdAmount, 18);
            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmountWei);
            await createChickenBond(proxy, lusdAmountWei, senderAcc.address);
            let bonds = await chickenBondsView.getUsersBonds(proxy.address);
            smallBondId = bonds[bonds.length - 1].bondID.toString();

            lusdAmountWei = hre.ethers.utils.parseUnits(lusdAmount, 18);
            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmountWei);

            await createChickenBond(proxy, lusdAmountWei, senderAcc.address);

            bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondID = bonds[bonds.length - 1].bondID.toString();
        });

        it('... should make a Chicken Bond Rebond strategy and subscribe', async () => {
            // eslint-disable-next-line max-len
            ({ subId, strategySub } = await subCbRebondStrategy(proxy, bondID, strategyId));
            const smallBondObject = await subCbRebondStrategy(proxy, smallBondId, strategyId);
            smallBondSubId = smallBondObject.subId;
            smallBondStrategySub = smallBondObject.strategySub;
        });

        it('... should trigger a Chicken Bond rebond strategy', async () => {
            const time = await getRebondTime(chickenBondsView, rebondTrigger, lusdAmount);

            if (time === Infinity) {
                console.log('Rebonding is not possible!');
                expect(true).to.be.eq(true);
            } else {
                await timeTravel(time);

                await callCbRebondStrategy(botAcc, strategyExecutor, subId, strategySub);

                const bonds = await chickenBondsView.getUsersBonds(proxy.address);
                bondIDNew = bonds[bonds.length - 1].bondID.toString();

                newLusdAmount = hre.ethers.utils.formatUnits(bonds[bonds.length - 1].lusdAmount, 18);

                expect(bonds[bonds.length - 1].lusdAmount).to.be.gt(lusdAmountWei);
                expect(+bondIDNew).to.be.eq(+bondID + 1);
                console.log(bondIDNew, bondID);
            }
        });

        it('... should rebond again for the new bondId', async () => {
            const abiCoder = new hre.ethers.utils.AbiCoder();

            if (newLusdAmount === 0) {
                console.log('Rebonding is not possible!');
                expect(true).to.be.eq(true);
            } else {
                const time = await getRebondTime(chickenBondsView, rebondTrigger, newLusdAmount);

                const triggerData = automationSdk.triggerService.cBondsRebondTrigger.encode(bondIDNew);

                const subIdEncoded = abiCoder.encode(['uint256'], [subId.toString()]);
                const bondIDNewEncoded = abiCoder.encode(['uint256'], [bondIDNew.toString()]);
                const bLusdTokenEncoded = abiCoder.encode(['address'], [BLUSD_ADDR]);
                const lusdTokenEncoded = abiCoder.encode(['address'], [LUSD_ADDR]);
                strategySub = [strategyId, false,
                    triggerData, [subIdEncoded, bondIDNewEncoded, bLusdTokenEncoded, lusdTokenEncoded]];

                await timeTravel(time);

                await callCbRebondStrategy(botAcc, strategyExecutor, subId, strategySub);

                const newLusdAmountWei = hre.ethers.utils.parseUnits(newLusdAmount, 18);

                const bonds = await chickenBondsView.getUsersBonds(proxy.address);
                bondIDNew = bonds[bonds.length - 1].bondID.toString();

                expect(bonds[bonds.length - 1].lusdAmount).to.be.gt(newLusdAmountWei);
                expect(+bondIDNew).to.be.eq(+bondID + 2);
            }
        });

        it('... should trigger a Chicken Bond rebond strategy and fail because Price and Gas impact was too high', async () => {
            const time = await getRebondTime(chickenBondsView, rebondTrigger, smallLusdAmount);

            if (time === Infinity) {
                console.log('Rebonding is not possible!');
                expect(true).to.be.eq(true);
            } else {
                await timeTravel(time);
                await expect(callCbRebondStrategy(botAcc, strategyExecutor, smallBondSubId, smallBondStrategySub)).to.be.reverted;
            }
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
