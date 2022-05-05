const { dcaStrategyTest } = require('./misc-tests');

describe('DCA Strategy test', function () {
    this.timeout(80000);

    it('... test dca strategy', async () => {
        await dcaStrategyTest();
    }).timeout(50000);
});
