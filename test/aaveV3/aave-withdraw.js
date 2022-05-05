const { redeploy } = require('../utils');
const { aaveV3WithdrawTest } = require('./aave-tests');

describe('Aave-Withdraw-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3Withdraw');
    });
    it('... should run full aave withdraw test', async () => {
        await aaveV3WithdrawTest();
    });
});
