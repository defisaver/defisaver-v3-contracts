const { curveUsdAdjustTest } = require('./curveusd-tests');

describe('CurveUsdAdjust', function () {
    this.timeout(60000);

    it('... should test Adjusting a CurveUsd position', async () => {
        await curveUsdAdjustTest();
    });
});
