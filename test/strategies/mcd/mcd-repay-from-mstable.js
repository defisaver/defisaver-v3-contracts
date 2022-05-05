const { mcdRepayFromMStableStrategyTest } = require('./mcd-tests');

describe('Mcd Repay from Mstable Strategy test', function () {
    this.timeout(80000);

    it('... test mcd repay from mstable strategy', async () => {
        await mcdRepayFromMStableStrategyTest();
    }).timeout(50000);
});
