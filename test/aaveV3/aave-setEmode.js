const { redeploy } = require('../utils');
const { aaveV3SetEModeTest } = require('./aave-tests');

describe('Aave-Set-EMode-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3SetEMode');
    });
    it('... should run full aave set EMode test', async () => {
        await aaveV3SetEModeTest();
    });
});
