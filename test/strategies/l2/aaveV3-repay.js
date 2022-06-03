const { aaveV3RepayL2StrategyTest } = require('./l2-tests');
const { resetForkToBlock } = require('../../utils');

describe('AaveV3 repay L2 strategy test', function () {
    this.timeout(80000);

    it('... test AaveV3 repay L2', async () => {
        await resetForkToBlock();

        await aaveV3RepayL2StrategyTest();
    }).timeout(50000);
});
