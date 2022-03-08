const {
    redeploy,
} = require('../utils');
const { balancerFLTest } = require('./fl-tests');

describe('FL-Balancer', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('FLBalancer');
        await redeploy('SendToken');
        await redeploy('TaskExecutor');
    });

    it('... should get a Balancer flash loan', async () => {
        await balancerFLTest();
    });
});
