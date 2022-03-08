const {
    redeploy,
} = require('../utils');
const { compClaimTest } = require('./comp-tests');

describe('Comp-Borrow', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompSupply');
        await redeploy('CompClaim');
    });

    it('... should test Compound claim', async () => {
        await compClaimTest();
    });
});
