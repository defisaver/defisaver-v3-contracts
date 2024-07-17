const { resetForkToBlock } = require('../../utils');
const { curveUsdPaybackStrategyTest } = require('./curveusd-tests');

describe('CurveUsd Payback Strategy test', function () {
    this.timeout(80000);

    it('... test CurveUsd payback strategy', async () => {
        await resetForkToBlock();
        await curveUsdPaybackStrategyTest();
    }).timeout(150000);
});
