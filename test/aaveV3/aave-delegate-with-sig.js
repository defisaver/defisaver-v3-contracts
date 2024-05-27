const { redeploy } = require('../utils');
const { aaveV3DelegateCreditWithSigTest } = require('./aave-tests');

describe('Aave-Delegate-Credi-With-Sig', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveV3DelegateWithSig');
    });
    it('... should run full aave delegate credit with sig test', async () => {
        await aaveV3DelegateCreditWithSigTest();
    });
});
