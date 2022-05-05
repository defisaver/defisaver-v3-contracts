const {
    redeploy,
} = require('../utils');
const { balancerSupplyTest } = require('./balancer-tests');

describe('Balancer-Supply', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('DFSSell');
        await redeploy('BalancerV2Supply');
    });
    it('... supply only first token for LP tokens', async () => {
        await balancerSupplyTest();
    }).timeout(50000);
});
