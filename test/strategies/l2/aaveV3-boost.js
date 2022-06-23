const { aaveV3BoostL2StrategyTest } = require('./l2-tests');
const { resetForkToBlock } = require('../../utils');

describe('AaveV3 boost L2 strategy test', function () {
    this.timeout(80000);

    it('... test AaveV3 boost L2', async () => {
        await resetForkToBlock();

        await aaveV3BoostL2StrategyTest();
    }).timeout(50000);
});
