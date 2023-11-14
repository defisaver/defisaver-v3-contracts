const { redeploy } = require('../../utils');
const { morphoAaveV3SetManagerBySigTest } = require('./morpho-aaveV3-tests');

describe('Morpho-Aave-V3-SetManagerBySig', function () {
    this.timeout(80000);
    before(async () => {
        await redeploy('MorphoAaveV3SetManagerBySig');
    });

    it('... should test Morpho AaveV3 supply', async () => {
        await morphoAaveV3SetManagerBySigTest();
    });
});
