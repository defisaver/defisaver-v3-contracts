const { compBoostRecipeTest } = require('./comp-tests');

describe('Comp Boost test', function () {
    this.timeout(80000);

    it('... test comp boost recipe', async () => {
        await compBoostRecipeTest();
    }).timeout(50000);
});
