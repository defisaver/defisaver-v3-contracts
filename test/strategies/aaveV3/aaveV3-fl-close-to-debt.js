const { aaveV3FLCloseToDebtStrategyTest } = require('./aaveV3-tests');
const config = require('../../../hardhat.config');

describe('AaveV3 FL close to debt strategy test', function () {
    this.timeout(80000);

    it('... test AaveV3 FL close to debt', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await aaveV3FLCloseToDebtStrategyTest(numTestPairs);
    }).timeout(50000);
});
