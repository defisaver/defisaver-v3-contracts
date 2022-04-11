const { compRepayStrategyTest } = require('./compound-tests');

describe('Comp Repay Strategy test', function () {
    this.timeout(80000);

    it('... test comp repay strategy', async () => {
        await compRepayStrategyTest();
    }).timeout(50000);
});
