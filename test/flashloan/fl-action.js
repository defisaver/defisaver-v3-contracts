const {
    redeploy,
} = require('../utils');

const {
    aaveFlTest, balancerFLTest, eulerFLTest, makerFLTest,
} = require('./fl-tests');

describe('FL-AaveV2', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('FLAction');
    });

    it('... should test generalised flash loan', async () => {
        await aaveFlTest(true);
        await balancerFLTest(true);
        await eulerFLTest(true);
        await makerFLTest(true);
    });
});
