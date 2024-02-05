const { aaveV3BoostStrategyTest } = require('./aaveV3-tests');
const config = require('../../../hardhat.config');

describe('AaveV3 boost strategy test', function () {
    this.timeout(80000);

    it('... test AaveV3 boost', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await aaveV3BoostStrategyTest(numTestPairs);
    }).timeout(50000);
});
