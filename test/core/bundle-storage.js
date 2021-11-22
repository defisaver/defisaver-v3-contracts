const { expect } = require('chai');
const hre = require('hardhat');

const {
    redeploy,
    impersonateAccount,
    stopImpersonatingAccount,
    OWNER_ACC,
} = require('../utils');

describe('Bundle Storage', () => {
    let bundleStorage; let owner; let bundleStorageFromOwner; let senderAcc;

    before(async () => {
        bundleStorage = await redeploy('BundleStorage');

        senderAcc = (await hre.ethers.getSigners())[0];

        owner = await hre.ethers.provider.getSigner(OWNER_ACC);
    });

    it('...should registry a new bundle ', async () => {
        await bundleStorage.createBundle([0, 1, 2]);

        const numBundles = await bundleStorage.getBundleCount();

        expect(numBundles).to.be.eq(1);
    });

    it('...should switch open to public to false', async () => {
        await impersonateAccount(OWNER_ACC);

        bundleStorageFromOwner = bundleStorage.connect(owner);

        await bundleStorageFromOwner.changeEditPermission(false);

        await stopImpersonatingAccount(OWNER_ACC);
    });

    it('...should fail to change edit permission from non owner acc', async () => {
        try {
            await bundleStorage.changeEditPermission(false);
        } catch (err) {
            expect(err.toString()).to.have.string('SenderNotOwner()');
        }
    });

    it('...should fail to reg. a new bundle from non owner acc', async () => {
        try {
            await bundleStorage.createBundle([0, 1, 2]);
        } catch (err) {
            expect(err.toString()).to.have.string('NoAuthToCreateBundle');
        }
    });

    it('...should reg. bundles from owner acc', async () => {
        await impersonateAccount(OWNER_ACC);

        await bundleStorageFromOwner.createBundle([0, 1, 2]);
        await bundleStorageFromOwner.createBundle([2, 5, 2]);
        await bundleStorageFromOwner.createBundle([6, 10, 1]);

        await stopImpersonatingAccount(OWNER_ACC);

        const numBundles = await bundleStorageFromOwner.getBundleCount();

        expect(numBundles).to.be.eq(4);
    });

    // view testing

    it('...should fetch a bundle by id', async () => {
        const bundleData = await bundleStorage.getBundle(0);

        expect(bundleData.creator).to.be.eq(senderAcc.address);
        const ids = bundleData.strategyIds.map((id) => id.toString());

        expect(ids).to.be.eql(['0', '1', '2']);
    });

    it('...should fetch strategy id from a bundle', async () => {
        const strategyId = await bundleStorage.getStrategyId(2, 1);

        expect(strategyId.toString()).to.be.eql('5');
    });

    it('...should fetch getPaginatedBundles', async () => {
        const bundles1 = await bundleStorageFromOwner.getPaginatedBundles(0, 2);

        expect(bundles1[0].creator).to.be.eq(senderAcc.address);
        expect(bundles1[1].creator).to.be.eq(OWNER_ACC);

        const bundles2 = await bundleStorageFromOwner.getPaginatedBundles(1, 2);

        expect(bundles2[0].creator).to.be.eq(OWNER_ACC);
        expect(bundles2[1].creator).to.be.eq(OWNER_ACC);
    });
});
