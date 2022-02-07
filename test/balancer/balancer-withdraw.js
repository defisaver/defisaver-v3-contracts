const {
    redeploy,
} = require('../utils');
const { balancerWithdrawTest } = require('./balancer-tests');

describe('Balancer-Withdraw', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('BalancerV2Supply');
        await redeploy('BalancerV2Withdraw');
    });

    it('... withdraw ', async () => {
        await balancerWithdrawTest();
    }).timeout(50000);
});
