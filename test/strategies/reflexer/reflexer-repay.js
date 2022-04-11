const { reflexerRepayStrategyTest } = require('./reflexer-tests');

describe('Reflexer Repay Strategy test', function () {
    this.timeout(80000);

    it('... test reflexer repay strategy', async () => {
        await reflexerRepayStrategyTest();
    }).timeout(50000);
});
