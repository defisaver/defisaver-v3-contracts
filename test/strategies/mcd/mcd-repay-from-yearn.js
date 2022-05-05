const { mcdRepayFromYearnStrategyTest } = require('./mcd-tests');

describe('Mcd Repay from Yearn Strategy test', function () {
    this.timeout(80000);

    it('... test mcd repay from yearn strategy', async () => {
        await mcdRepayFromYearnStrategyTest();
    }).timeout(50000);
});
