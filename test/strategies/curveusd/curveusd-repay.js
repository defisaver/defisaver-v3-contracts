const { resetForkToBlock } = require('../../utils');
const { curveUsdRepayStrategyTest } = require('./curveusd-tests');

describe('CurveUsd Repay Strategy test', function () {
    this.timeout(80000);

    it('... test CurveUsd repay strategy', async () => {
        await resetForkToBlock();
        await curveUsdRepayStrategyTest();
    }).timeout(50000);
});
