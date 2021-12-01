const { expect } = require('chai');
const hre = require('hardhat');

const {
    redeploy,
    impersonateAccount,
    stopImpersonatingAccount,
    OWNER_ACC,
} = require('../utils');

describe('BotAuth', () => {
    let botAuth; let owner; let senderAcc; let botAcc1; let botAcc2;

    before(async () => {
        botAuth = await redeploy('BotAuth');

        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc1 = (await hre.ethers.getSigners())[1];
        botAcc2 = (await hre.ethers.getSigners())[2];

        owner = await hre.ethers.provider.getSigner(OWNER_ACC);
    });

    it('...should add a 2 new accounts to botAuth', async () => {
        await impersonateAccount(OWNER_ACC);
        botAuth = botAuth.connect(owner);

        await botAuth.addCaller(botAcc1.address);
        await botAuth.addCaller(botAcc2.address);

        const bot1Approval = await botAuth.approvedCallers(botAcc1.address);
        const bot2Approval = await botAuth.approvedCallers(botAcc2.address);

        expect(bot1Approval).to.be.eq(true);
        expect(bot2Approval).to.be.eq(true);
    });

    it('...should remove auth from account', async () => {
        await botAuth.removeCaller(botAcc1.address);

        const bot1Approval = await botAuth.approvedCallers(botAcc1.address);
        const bot2Approval = await botAuth.approvedCallers(botAcc2.address);

        expect(bot1Approval).to.be.eq(false);
        expect(bot2Approval).to.be.eq(true);

        await stopImpersonatingAccount(OWNER_ACC);
    });

    it('...should fail to add new acc. because sender not owner', async () => {
        try {
            botAuth = botAuth.connect(senderAcc);
            await botAuth.addCaller(botAcc1.address);
            expect(true).to.be.equal(false);
        } catch (err) {
            expect(err.toString()).to.have.string('SenderNotOwner()');
        }
    });

    it('...should fail to remove new acc. because sender not owner', async () => {
        try {
            await botAuth.removeCaller(botAcc1.address);
            expect(true).to.be.equal(false);
        } catch (err) {
            expect(err.toString()).to.have.string('SenderNotOwner()');
        }
    });
});
