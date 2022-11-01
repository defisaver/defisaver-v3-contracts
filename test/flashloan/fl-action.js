const {
    redeploy,
} = require('../utils');

const {
    aaveFlTest, balancerFLTest, eulerFLTest, makerFLTest, aaveV3FlTest,
} = require('./fl-tests');

describe('Generalised flashloan test', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('FLAction');
    });

    it('... should test generalised flash loan', async () => {
        // Mainnet only

        await aaveFlTest(true);
        await eulerFLTest(true);
        await makerFLTest(true);

        await balancerFLTest(true);
        // L2 only
        //await aaveV3FlTest(true);
    });
});
