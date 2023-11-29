const { curveUsdBoostStrategyTest } = require('./curveusd-tests');

describe('CurveUsd Boost Strategy test', function () {
    this.timeout(80000);

    it('... test CurveUsd boost strategy', async () => {
        await curveUsdBoostStrategyTest();
    }).timeout(50000);
});
