const { balancerClaimTest } = require('./balancer-tests.js');

describe('Balancer Claiming', function () {
    this.timeout(80000);
    before(async () => {
    });

    it('... claims Balancer tokens', async () => {
        await balancerClaimTest();
    }).timeout(50000);
});
