const { compCreateRecipeTest } = require('./comp-tests');

describe('Comp Create test', function () {
    this.timeout(80000);

    it('... test comp create recipe', async () => {
        await compCreateRecipeTest();
    }).timeout(50000);
});
