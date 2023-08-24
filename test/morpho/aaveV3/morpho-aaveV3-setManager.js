const { redeploy } = require('../../utils');
const { morphoAaveV3SetManagerTest } = require('./morpho-aaveV3-tests');

describe('Morpho-Aave-V3-SetManager', function () {
    this.timeout(80000);
    before(async () => {
        await redeploy('MorphoAaveV3SetManager');
    });

    it('... should test Morpho AaveV3 supply', async () => {
        await morphoAaveV3SetManagerTest();
    });
});
