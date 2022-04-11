const { mcdBoostStrategyTest } = require('./mcd-tests');

describe('Mcd Boost Strategy test', function () {
    this.timeout(80000);

    it('... test mcd boost strategy', async () => {
        await mcdBoostStrategyTest();
    }).timeout(50000);
});
