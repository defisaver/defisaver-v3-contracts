const { aaveV3RepayStrategyTest } = require('./aaveV3-tests');
const config = require('../../../hardhat.config');

describe('AaveV3 repay strategy test', function () {
    this.timeout(80000);

    it('... test AaveV3 repay', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await aaveV3RepayStrategyTest(numTestPairs);
    }).timeout(50000);
});
