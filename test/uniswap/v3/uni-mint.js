const {
    redeploy,
} = require('../../utils');

const { uniV3MintTest } = require('./univ3-tests');

describe('Uni-Mint-V3', () => {
    before(async () => {
        await redeploy('UniMintV3');
    });

    it('... should mint a position to uniswap V3', async () => {
        await uniV3MintTest();
    }).timeout(50000);
});
