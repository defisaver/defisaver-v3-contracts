const { redeploy } = require('../utils');
const { aaveV3ClaimRewardsTest } = require('./aave-tests');

describe('Aave-ClaimRewards-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveV3ClaimRewards');
    });

    it('... should run a test to claim OP incentive rewards on Aave V3', async () => {
        await aaveV3ClaimRewardsTest();
    });
});
