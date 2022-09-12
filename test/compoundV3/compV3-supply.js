const {
    redeploy,
} = require('../utils');
const { compV3SupplyTest } = require('./compV3-tests');

describe('CompV3-Supply', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompV3Supply');
    });

    it('... should test CompoundV3 supply', async () => {
        await compV3SupplyTest();
    });
});
