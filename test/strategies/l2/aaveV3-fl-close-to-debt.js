const { aaveV3FLCloseToDebtL2StrategyTest } = require('./l2-tests');
const config = require('../../../hardhat.config');

describe('AaveV3 FL close to debt L2 strategy test', function () {
    this.timeout(80000);

    it('... test AaveV3 FL close to debt L2', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await aaveV3FLCloseToDebtL2StrategyTest(numTestPairs);
    }).timeout(50000);
});
