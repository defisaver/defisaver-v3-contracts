const { sparkCloseToDebtStrategyTest } = require('./spark-tests');
const config = require('../../../hardhat.config');

describe('Spark close to debtstrategy test', function () {
    this.timeout(80000);

    it('... test Spark close to debt', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await sparkCloseToDebtStrategyTest(numTestPairs);
    }).timeout(50000);
});
