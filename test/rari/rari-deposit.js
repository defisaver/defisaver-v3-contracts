const {
    redeploy,
} = require('../utils');

const { rariDepositTest } = require('./rari-tests');

describe('Rari deposit', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('RariDeposit');
    });
    it('... Try to supply 10k dai to Rari DAI pool', async () => {
        await rariDepositTest();
    }).timeout(1000000);
});
