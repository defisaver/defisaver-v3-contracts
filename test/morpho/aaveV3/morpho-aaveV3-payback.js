const {
    redeploy,
} = require('../../utils');
const { morphoAaveV3PaybackTest } = require('./morpho-aaveV3-tests');

describe('Morpho-Aave-V3-Payback', function () {
    this.timeout(80000);
    before(async () => {
        await redeploy('MorphoAaveV3Supply');
        await redeploy('MorphoAaveV3Borrow');
        await redeploy('MorphoAaveV3Payback');
    });

    it('... should test Morpho AaveV3 payback', async () => {
        await morphoAaveV3PaybackTest();
    });
});
