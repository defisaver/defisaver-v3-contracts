const { redeploy } = require('../utils');
const { aaveV3SupplyTest } = require('./aave-tests');

describe('Aave-Supply-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveV3Supply');
    });

    it('... should run full aave supply test', async () => {
        await aaveV3SupplyTest();
    });
});
