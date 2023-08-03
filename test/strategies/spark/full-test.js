const { sparkStrategiesTest } = require('./spark-tests');
const config = require('../../../hardhat.config');

describe('Spark strategy tests', function () {
    this.timeout(80000);

    it('... test Spark strategies', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await sparkStrategiesTest(numTestPairs);
    }).timeout(50000);
});
