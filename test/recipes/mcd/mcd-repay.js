const { mcdRepayTest } = require('./mcd-tests');

describe('Mcd Repay test', function () {
    this.timeout(80000);

    it('... test mcd Repay recipe', async () => {
        await mcdRepayTest();
    }).timeout(50000);
});
