const {
    redeploy,
} = require('../utils');
const { aaveV2assetsDefaultMarket } = require('../utils-aave');
const { aaveSupplyTest } = require('./aave-tests');

describe('Aave-Supply', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveSupply');
    });
    it('... should run full aave supply test', async () => {
        await aaveSupplyTest(aaveV2assetsDefaultMarket.length);
    });
});
