const { sparkCloseToCollStrategyTest } = require('./spark-tests');
const config = require('../../../hardhat.config');

describe('Spark close to collateralstrategy test', function () {
    this.timeout(80000);

    it('... test Spark close to collateral', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await sparkCloseToCollStrategyTest(numTestPairs);
    }).timeout(50000);
});
