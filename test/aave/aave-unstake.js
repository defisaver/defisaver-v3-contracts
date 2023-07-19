const {
    redeploy,
} = require('../utils');

const { aaveUnstakeTest } = require('./aave-tests');

describe('Aave-Unstake', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('AaveUnstake');
    });
    it('... should run aave unstake test', async () => {
        await aaveUnstakeTest();
    });
});
