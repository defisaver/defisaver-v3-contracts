const { resetForkToBlock } = require('../../utils');
const { curveUsdBoostStrategyTest } = require('./curveusd-tests');

describe('CurveUsd Boost Strategy test', function () {
    this.timeout(80000);

    it('... test CurveUsd boost strategy', async () => {
        await resetForkToBlock();
        await curveUsdBoostStrategyTest();
    }).timeout(150000);
});
