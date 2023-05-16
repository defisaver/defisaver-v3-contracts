const {
    redeploy,
} = require('../../utils');
const { morphoAaveV3BorrowTest } = require('./morpho-aaveV3-tests');

describe('Morpho-Aave-V3-Borrow', function () {
    this.timeout(80000);
    before(async () => {
        await redeploy('MorphoAaveV3Supply');
        await redeploy('MorphoAaveV3Borrow');
    });

    it('... should test Morpho AaveV3 borrow', async () => {
        await morphoAaveV3BorrowTest();
    });
});
