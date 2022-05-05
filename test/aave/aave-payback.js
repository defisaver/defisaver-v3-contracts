const {
    redeploy,
} = require('../utils');
const { aaveV2assetsDefaultMarket } = require('../utils-aave');
const { aavePaybackTest } = require('./aave-tests');

describe('Aave-Payback', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('AaveSupply');
        await redeploy('AaveBorrow');
        await redeploy('AavePayback');
        await redeploy('DFSSell');
    });
    it('... should run full aave payback test', async () => {
        await aavePaybackTest(aaveV2assetsDefaultMarket.length);
    });
});
