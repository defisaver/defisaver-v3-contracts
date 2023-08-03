const { sparkFLCloseToCollStrategyTest } = require('./spark-tests');
const config = require('../../../hardhat.config');

describe('Spark FL close to collateralstrategy test', function () {
    this.timeout(80000);

    it('... test Spark FL close to collateral', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await sparkFLCloseToCollStrategyTest(numTestPairs);
    }).timeout(50000);
});
