const {
    redeploy,
} = require('../utils');

const { yearnWithdrawTest } = require('./yearn-tests');

describe('Yearn-Withdraw', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('YearnSupply');
        await redeploy('YearnWithdraw');
    });

    it('... should withdraw from Yearn', async () => {
        await yearnWithdrawTest(0);
    }).timeout(100000);
});
