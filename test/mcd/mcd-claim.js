const {
    redeploy,
} = require('../utils');

const { mcdClaimTest } = require('./mcd-tests');

describe('Mcd-Claim', () => {
    before(async () => {
        await redeploy('McdOpen');
        await redeploy('McdSupply');
        await redeploy('McdView');
        await redeploy('McdClaim');
    });

    it('... should give a cdp to another proxy', async () => {
        await mcdClaimTest();
    });
});
