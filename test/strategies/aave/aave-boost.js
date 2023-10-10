const { aaveV2BoostTest } = require('./aave-tests');

describe('Aave Boost Strategy test', function () {
    this.timeout(80000);

    it('... test aave boost strategy', async () => {
        await aaveV2BoostTest();
    }).timeout(50000);
});
