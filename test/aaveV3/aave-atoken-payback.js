const { redeploy } = require('../utils');
const { aaveV3ATokenPaybackTest } = require('./aave-tests');

describe('AaveV3-ATokenPayback-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3Borrow');
        await redeploy('AaveV3ATokenPayback');
    });
    it('... should run full aave atoken payback test', async () => {
        await aaveV3ATokenPaybackTest();
    });
});
