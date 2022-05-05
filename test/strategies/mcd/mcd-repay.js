const { mcdRepayStrategyTest } = require('./mcd-tests');

describe('Mcd Repay Strategy test', function () {
    this.timeout(80000);

    it('... test mcd repay strategy', async () => {
        await mcdRepayStrategyTest();
    }).timeout(50000);
});
