const { redeploy } = require('../utils');
const { aaveV3ClaimRewardsTest } = require('./aave-tests');

describe('Aave-Borrow-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveV3ClaimRewards');
    });

    it('... should run full aave borrow test', async () => {
        await aaveV3ClaimRewardsTest();
    });
});