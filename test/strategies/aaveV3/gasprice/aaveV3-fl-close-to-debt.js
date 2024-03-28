const config = require('../../../../hardhat.config');
const { aaveV3FLCloseToDebtWithMaximumGasPriceStrategyTest } = require('./aaveV3-tests');

describe('AaveV3 FL close to debt with maximum gas price strategy test', function () {
    this.timeout(80000);

    it('... test AaveV3 FL close to debt with maximum gas price', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await aaveV3FLCloseToDebtWithMaximumGasPriceStrategyTest(numTestPairs);
    }).timeout(50000);
});
