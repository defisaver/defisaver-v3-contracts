const {
    redeploy,
} = require('../utils');

const { rariWithdrawTest } = require('./rari-tests');

describe('Rari deposit', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('RariDeposit');
        await redeploy('RariWithdraw');
    });

    it('... Try to supply 10k USDC to proxy and withdraw 10k USDC - Rari stable pool', async () => {
        await rariWithdrawTest();
    }).timeout(1000000);
});
