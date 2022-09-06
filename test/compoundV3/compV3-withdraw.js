const {
    redeploy,
} = require('../utils');
const { compV3WithdrawTest } = require('./compV3-tests');

describe('CompV3-Withdraw', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompV3Withdraw');
    });

    it('... should test CompoundV3 withdraw', async () => {
        await compV3WithdrawTest();
    });
});
