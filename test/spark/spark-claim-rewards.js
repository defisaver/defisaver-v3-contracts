const { redeploy } = require('../utils');
const { sparkClaimRewardsTest } = require('./spark-tests');

describe('Spark-ClaimRewards', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkClaimRewards');
    });

    it('... should run a test to claim OP incentive rewards on Spark V3', async () => {
        await sparkClaimRewardsTest();
    });
});
