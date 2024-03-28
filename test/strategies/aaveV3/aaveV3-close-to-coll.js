const { aaveV3CloseToCollStrategyTest } = require('./aaveV3-tests');
const config = require('../../../hardhat.config');

describe('AaveV3 close to collateral strategy test', function () {
    this.timeout(80000);

    it('... test AaveV3 close to collateral', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await aaveV3CloseToCollStrategyTest(numTestPairs);
    }).timeout(50000);
});
