const { liquityBoostStrategyTest } = require('./liquity-tests');

describe('Liquity Boost Strategy test', function () {
    this.timeout(80000);

    it('... test liquity boost strategy', async () => {
        await liquityBoostStrategyTest();
    }).timeout(50000);
});
