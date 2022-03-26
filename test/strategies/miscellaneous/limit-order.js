const { limitOrderStrategyTest } = require('./misc-tests');

describe('Limit order Strategy test', function () {
    this.timeout(80000);

    it('... test limit order strategy', async () => {
        await limitOrderStrategyTest();
    }).timeout(50000);
});
