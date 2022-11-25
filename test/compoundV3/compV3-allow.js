const {
    redeploy,
} = require('../utils');
const { compV3AllowTest } = require('./compV3-tests');

describe('CompV3-Allow', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompV3Allow');
    });

    it('... should test CompoundV3 allow', async () => {
        await compV3AllowTest();
    });
});
