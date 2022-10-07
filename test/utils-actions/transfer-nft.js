const {
    redeploy,
} = require('../utils');
const { transferNFTTest } = require('./utils-actions-tests');

describe('Transfer-Nft', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('TransferNFT');
    });

    it('... should transfer a nft token from proxy wallet', async () => {
        await transferNFTTest();
    });
});
