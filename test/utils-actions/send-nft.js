const {
    redeploy,
} = require('../utils');
const { sendNFTTest } = require('./utils-actions-tests');

describe('Send-Nft', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('SendNFT');
    });

    it('... should send a nft token from proxy wallet', async () => {
        await sendNFTTest();
    });
});
