const { sparkBoostStrategyTest } = require('./spark-tests');
const config = require('../../../hardhat.config');

describe('Spark booststrategy test', function () {
    this.timeout(80000);

    it('... test Spark boost', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await sparkBoostStrategyTest(numTestPairs);
    }).timeout(50000);
});
