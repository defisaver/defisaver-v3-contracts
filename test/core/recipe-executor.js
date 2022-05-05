const { recipeExecutorTest } = require('./core-tests');

describe('Recipe-Executor', () => {
    it('... should test recipeExecutor', async () => {
        await recipeExecutorTest();
    }).timeout(50000);
});
