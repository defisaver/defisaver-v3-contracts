const { sparkRepayStrategyTest } = require('./spark-tests');
const config = require('../../../hardhat.config');

describe('Spark repaystrategy test', function () {
    this.timeout(80000);

    it('... test Spark repay', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await sparkRepayStrategyTest(numTestPairs);
    }).timeout(50000);
});
