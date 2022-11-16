const {
    redeploy,
} = require('../utils');
const { compV3PaybackTest } = require('./compV3-tests');

describe('CompV3-Payback', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompV3Payback');
    });

    it('... should test CompoundV3 payback', async () => {
        await compV3PaybackTest();
    });
});
