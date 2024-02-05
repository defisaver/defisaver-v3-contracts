const { aaveV3FLCloseToCollStrategyTest } = require('./aaveV3-tests');
const config = require('../../../hardhat.config');

describe('AaveV3 FL close to collateral strategy test', function () {
    this.timeout(80000);

    it('... test AaveV3 FL close to collateral', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await aaveV3FLCloseToCollStrategyTest(numTestPairs);
    }).timeout(50000);
});
