const { sparkFLCloseToDebtStrategyTest } = require('./spark-tests');
const config = require('../../../hardhat.config');

describe('Spark FL close to debtstrategy test', function () {
    this.timeout(80000);

    it('... test Spark FL close to debt', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await sparkFLCloseToDebtStrategyTest(numTestPairs);
    }).timeout(50000);
});
