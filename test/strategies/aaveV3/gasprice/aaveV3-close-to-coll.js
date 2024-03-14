const config = require('../../../../hardhat.config');
const { aaveV3CloseToCollWithMaximumGasPriceStrategyTest } = require('./aaveV3-tests');

describe('AaveV3 close to collateral with maximum gas price strategy test', function () {
    this.timeout(80000);

    it('... test AaveV3 close to collateral with maximum gas price ', async () => {
        let numTestPairs = 3;

        if (config.lightTesting) numTestPairs = 1;
        await aaveV3CloseToCollWithMaximumGasPriceStrategyTest(numTestPairs);
    }).timeout(50000);
});
