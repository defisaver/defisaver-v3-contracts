const { expect } = require('chai');
const hre = require('hardhat');

const {
    redeploy,
} = require('../utils');

const { getSubHash } = require('../utils-strategies');

describe('Sub Storage', () => {
    let subStorage; let senderAcc2;

    before(async () => {
        subStorage = await redeploy('SubStorage');

        senderAcc2 = (await hre.ethers.getSigners())[1];
    });

    it('...should add a new subscription', async () => {
        const subData = [50, false, [], []];
        const subDataHash = getSubHash(subData);

        await subStorage.subscribeToStrategy(subData);

        const numSubs = await subStorage.getSubsCount();

        expect(numSubs).to.be.eq(1);
        const storedSub = await subStorage.getSub(0);
        expect(storedSub.strategySubHash).to.be.eq(subDataHash);
    });

    it('...should update the new subscription', async () => {
        const updatedSubData = [42, false, [], []];

        const subDataHash = getSubHash(updatedSubData);

        await subStorage.updateSubData(0, updatedSubData);

        const storedSub = await subStorage.getSub(0);
        expect(storedSub.strategySubHash).to.be.eq(subDataHash);
    });

    it('...should fail to update the subscription from non-owner account', async () => {
        try {
            const updatedSubData = [42, false, [], []];
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
