const { mcdCloseTest } = require('./mcd-tests');

describe('Mcd Close test', function () {
    this.timeout(80000);

    it('... test mcd Close recipe', async () => {
        await mcdCloseTest();
    }).timeout(50000);
});
