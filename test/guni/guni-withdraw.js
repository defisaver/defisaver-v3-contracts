const {
    redeploy,
} = require('../utils');

const { guniWithdrawTest } = require('./guni-tests');

describe('GUNI Withdraw', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('GUniDeposit');
        await redeploy('GUniWithdraw');
    });

    it('... Try to supply 10k dai and 10k USDT do G-UNI LP pool and then withdraw everything', async () => {
        await guniWithdrawTest();
    }).timeout(100000);
});
