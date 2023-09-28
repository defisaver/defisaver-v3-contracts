const {
    redeploy,
} = require('../utils');
const { curveUsdAdjustTest } = require('./curveusd-tests');

describe('CurveUsdAdjust', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('CurveUsdCreate');
        await redeploy('CurveUsdAdjust');
    });

    it('... should test Adjusting a CurveUsd position', async () => {
        await curveUsdAdjustTest();
    });
});
