const {
    redeploy,
} = require('../utils');
const { compV3ClaimTest } = require('./compV3-tests');

describe('CompV3-Claim', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompV3Claim');
    });

    it('... should test CompoundV3 claim', async () => {
        await compV3ClaimTest();
    });
});
