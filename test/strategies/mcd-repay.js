const hre = require('hardhat');

const {
    getProxy,
    redeploy,
} = require('../utils');

//

describe('Mcd-Repay', function () {
    this.timeout(80000);

    let senderAcc; let proxy;

    before(async () => {
        await redeploy('WrapEth');

        senderAcc = (await hre.ethers.getSigners())[0];
        // eslint-disable-next-line no-unused-vars
        proxy = await getProxy(senderAcc.address);
    });

    it('... should make a new strategy', async () => {
    });
});
