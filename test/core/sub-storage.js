const { expect } = require('chai');
const hre = require('hardhat');

const {
    redeploy,
} = require('../utils');

const { getSubHash } = require('../utils-strategies');

describe('SubStorage', () => {
    let subStorage; let senderAcc2; let strategyStorage;

    before(async () => {
        subStorage = await redeploy('SubStorage');
        strategyStorage = await redeploy('StrategyStorage');

        await strategyStorage.createStrategy('TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
        await strategyStorage.createStrategy('TestStrategy2', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);

        senderAcc2 = (await hre.ethers.getSigners())[1];
    });

    it('...should add a new subscription', async () => {
        const subData = [0, false, [], []];
        const subDataHash = getSubHash(subData);

        await subStorage.subscribeToStrategy(subData);

        const numSubs = await subStorage.getSubsCount();

        expect(numSubs).to.be.eq(1);
        const storedSub = await subStorage.getSub(0);
        expect(storedSub.strategySubHash).to.be.eq(subDataHash);
    });

    it('...should fail to add a new subscription with an invalid subId', async () => {
        try {
            const subData = [42069, false, [], []];

            await subStorage.subscribeToStrategy(subData);
        } catch (err) {
            expect(err.toString()).to.have.string('SubIdOutOfRange');
        }
    });

    it('...should fail to add a new subscription with an invalid bundleId', async () => {
        try {
            const subData = [42069, true, [], []];

            await subStorage.subscribeToStrategy(subData);
        } catch (err) {
            expect(err.toString()).to.have.string('SubIdOutOfRange');
        }
    });

    it('...should update the new subscription', async () => {
        const updatedSubData = [1, false, [], []];

        const subDataHash = getSubHash(updatedSubData);

        await subStorage.updateSubData(0, updatedSubData);

        const storedSub = await subStorage.getSub(0);
        expect(storedSub.strategySubHash).to.be.eq(subDataHash);
    });

    it('...should fail to update with and invalid subId', async () => {
        try {
            const updatedSubData = [42069, false, [], []];

            await subStorage.updateSubData(0, updatedSubData);
        } catch (err) {
            expect(err.toString()).to.have.string('SubIdOutOfRange');
        }
    });

    it('...should fail to update with and invalid bundleId', async () => {
        try {
            const updatedSubData = [42069, true, [], []];

            await subStorage.updateSubData(0, updatedSubData);
        } catch (err) {
            expect(err.toString()).to.have.string('SubIdOutOfRange');
        }
    });

    it('...should fail to update the subscription from non-owner account', async () => {
        try {
            const updatedSubData = [1, false, [], []];
            const subStorageSender2 = subStorage.connect(senderAcc2);

            await subStorageSender2.updateSubData(0, updatedSubData);
        } catch (err) {
            expect(err.toString()).to.have.string('SenderNotSubOwnerError');
        }
    });

    it('...should deactivate users sub', async () => {
        await subStorage.deactivateSub(0);

        const storedSub = await subStorage.getSub(0);
        expect(storedSub.isEnabled).to.be.eq(false);
    });

    it('...should fail to deactivate users sub from non-owner account', async () => {
        try {
            const subStorageSender2 = subStorage.connect(senderAcc2);

            await subStorageSender2.deactivateSub(0);
        } catch (err) {
            expect(err.toString()).to.have.string('SenderNotSubOwnerError');
        }
    });

    it('...should activate users sub', async () => {
        await subStorage.activateSub(0);

        const storedSub = await subStorage.getSub(0);
        expect(storedSub.isEnabled).to.be.eq(true);
    });

    it('...should fail to activate users sub from non-owner account', async () => {
        try {
            const subStorageSender2 = subStorage.connect(senderAcc2);

            await subStorageSender2.activateSub(0);
        } catch (err) {
            expect(err.toString()).to.have.string('SenderNotSubOwnerError');
        }
    });
});
