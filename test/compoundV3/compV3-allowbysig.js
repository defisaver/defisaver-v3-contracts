const {
    redeploy,
} = require('../utils');
const { compV3AllowBySigTest } = require('./compV3-tests');

describe('CompV3AllowBySig', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompV3AllowBySig');
    });

    it('... should test CompV3AllowBySig action', async () => {
        await compV3AllowBySigTest();
    });
});
