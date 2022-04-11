const { mcdBoostTest } = require('./mcd-tests');

describe('Mcd Boost test', function () {
    this.timeout(80000);

    it('... test mcd boost recipe', async () => {
        await mcdBoostTest();
    }).timeout(50000);
});
