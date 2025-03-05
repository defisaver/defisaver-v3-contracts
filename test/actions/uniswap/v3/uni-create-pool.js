const { univ3CreatePoolTest } = require('./univ3-tests');

describe('Uni-Mint-V3', () => {
    it('create a pool that does not exist yet and mint a position in it', async () => {
        await univ3CreatePoolTest();
    }).timeout(50000);
});
