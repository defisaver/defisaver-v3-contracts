const {
    redeploy,
} = require('../utils');
const { guniDepositTest } = require('./guni-tests');

describe('GUNI deposit', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('GUniDeposit');
    });

    it('... Try to supply 10k dai and 10k USDT do G-UNI LP pool', async () => {
        await guniDepositTest();
    }).timeout(100000);
});
