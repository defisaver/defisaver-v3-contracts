const { expect } = require('chai');
const hre = require('hardhat');

const {
    redeploy,
    impersonateAccount,
    stopImpersonatingAccount,
    OWNER_ACC,
} = require('../utils');

describe('StrategyStorage', () => {
    let strategyStorage; let owner; let strategyStorageFromOwner; let senderAcc;

    before(async () => {
        strategyStorage = await redeploy('StrategyStorage');

        senderAcc = (await hre.ethers.getSigners())[0];

        owner = await hre.ethers.provider.getSigner(OWNER_ACC);
    });

    it('...should registry a new strategy ', async () => {
        await strategyStorage.createStrategy('TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);

        const numStrategies = await strategyStorage.getStrategyCount();

        expect(numStrategies).to.be.eq(1);
    });

    it('...should switch open to public to false', async () => {
        await impersonateAccount(OWNER_ACC);

        strategyStorageFromOwner = strategyStorage.connect(owner);

        await strategyStorageFromOwner.changeEditPermission(false);

        await stopImpersonatingAccount(OWNER_ACC);
    });

    it('...should fail to change edit permission from non owner acc', async () => {
        try {
            await strategyStorage.changeEditPermission(false);
            expect(true).to.be.equal(false);
        } catch (err) {
            expect(err.toString()).to.have.string('SenderNotOwner()');
        }
    });

    it('...should fail to reg. a new strategy from non owner acc', async () => {
        try {
            await strategyStorage.createStrategy('TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
            expect(true).to.be.equal(false);
        } catch (err) {
            expect(err.toString()).to.have.string('NoAuthToCreateStrategy');
        }
    });

    it('...should reg. strategies from owner acc', async () => {
        await impersonateAccount(OWNER_ACC);

        await strategyStorageFromOwner.createStrategy('TestStrategy2', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
        await strategyStorageFromOwner.createStrategy('TestStrategy3', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
        await strategyStorageFromOwner.createStrategy('TestStrategy4', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);

        await stopImpersonatingAccount(OWNER_ACC);

        const numStrategies = await strategyStorageFromOwner.getStrategyCount();

        expect(numStrategies).to.be.eq(4);
    });

    // view testing

    it('...should fetch a strategy by id', async () => {
        const strategyData = await strategyStorage.getStrategy(0);

        expect(strategyData.creator).to.be.eq(senderAcc.address);
        expect(strategyData.name).to.be.eq('TestStrategy');
    });

    it('...should fetch getPaginatedStrategies', async () => {
        const strategies1 = await strategyStorageFromOwner.getPaginatedStrategies(0, 2);

        expect(strategies1[0].name).to.be.eq('TestStrategy');
        expect(strategies1[1].name).to.be.eq('TestStrategy2');

        const strategies2 = await strategyStorageFromOwner.getPaginatedStrategies(1, 2);

        expect(strategies2[0].name).to.be.eq('TestStrategy3');
        expect(strategies2[1].name).to.be.eq('TestStrategy4');
    });
});
