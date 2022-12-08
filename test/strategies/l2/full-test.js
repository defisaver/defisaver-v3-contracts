const { l2StrategiesTest } = require('./l2-tests');
const config = require('../../../hardhat.config');

describe('L2 strategy tests', function () {
    this.timeout(80000);

    it('... test L2 strategies', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await l2StrategiesTest(numTestPairs);
    }).timeout(50000);
});
