const { mcdCreateTest } = require('./mcd-tests');

describe('Mcd Create test', function () {
    this.timeout(80000);

    it('... test mcd create recipe', async () => {
        await mcdCreateTest();
    }).timeout(50000);
});
