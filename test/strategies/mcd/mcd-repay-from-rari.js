const { mcdRepayFromRariStrategyTest } = require('./mcd-tests');

describe('Mcd Repay from Rari Strategy test', function () {
    this.timeout(80000);

    it('... test mcd repay from rari strategy', async () => {
        await mcdRepayFromRariStrategyTest();
    }).timeout(50000);
});
