const { reflexerBoostStrategyTest } = require('./reflexer-tests');

describe('Reflexer Boost Strategy test', function () {
    this.timeout(80000);

    it('... test reflexer boost strategy', async () => {
        await reflexerBoostStrategyTest();
    }).timeout(50000);
});
