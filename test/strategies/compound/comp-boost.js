const { compV2BoostTest } = require('./compound-tests');

describe('Comp Boost Strategy test', function () {
    this.timeout(80000);

    it('... test comp boost strategy', async () => {
        await compV2BoostTest();
    }).timeout(50000);
});
