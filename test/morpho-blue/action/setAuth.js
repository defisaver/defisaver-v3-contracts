const hre = require('hardhat');
const { expect } = require('chai');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
} = require('../../utils');
const { MORPHO_BLUE_ADDRESS } = require('../utils');
const { morphoBlueSetAuth } = require('../../actions');

describe('Morpho-Blue-SetAuth', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let snapshot;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('MorphoBlueSetAuth');
    });
    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });
    it('should give auth for proxy position to someone', async () => {
        const morphoBlue = await hre.ethers.getContractAt('IMorphoBlue', MORPHO_BLUE_ADDRESS);
        expect(await morphoBlue.isAuthorized(proxy.address, senderAcc.address)).to.be.eq(false);
        await morphoBlueSetAuth(proxy, senderAcc.address, true);
        expect(await morphoBlue.isAuthorized(proxy.address, senderAcc.address)).to.be.eq(true);
    });
});
