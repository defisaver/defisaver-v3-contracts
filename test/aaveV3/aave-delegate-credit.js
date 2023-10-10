const { redeploy } = require('../utils');
const { aaveV3DelegateCreditTest } = require('./aave-tests');

describe('Aave-Delegate-Credit', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveV3DelegateCredit');
    });
    it('... should run full aave delegate credit test', async () => {
        await aaveV3DelegateCreditTest();
    });
});
