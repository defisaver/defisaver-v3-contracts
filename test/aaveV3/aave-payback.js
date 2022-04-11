const { redeploy } = require('../utils');
const { aaveV3PaybackTest } = require('./aave-tests');

describe('AaveV3-Payback-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3Borrow');
        await redeploy('AaveV3Payback');
    });
    it('... should run full aave payback test', async () => {
        await aaveV3PaybackTest();
    });
});
