const { redeploy } = require('../utils');
const { aaveV3CollSwitchTest } = require('./aave-tests');

describe('Aave-Coll-Switch-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3CollateralSwitch');
    });

    it('... should run full aave coll switch test', async () => {
        await aaveV3CollSwitchTest();
    });
});
