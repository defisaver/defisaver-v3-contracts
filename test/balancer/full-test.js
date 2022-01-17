const { balancerFullTest, balancerClaimTest } = require('./balancer-tests');

describe('Balancer full test', () => {
    it('... should do full Balancer test', async () => {
        await balancerFullTest();
        await balancerClaimTest();
    });
});
