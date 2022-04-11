const { compBoostStrategyTest } = require('./compound-tests');

describe('Comp Boost Strategy test', function () {
    this.timeout(80000);

    it('... test comp boost strategy', async () => {
        await compBoostStrategyTest();
    }).timeout(50000);
});
