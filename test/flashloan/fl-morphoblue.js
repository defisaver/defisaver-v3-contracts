const {
    redeploy,
} = require('../utils');
const { flMorphoBlueTest } = require('./fl-tests');

describe('FL-MorphoBlue', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('FLMorphoBlue');
        await redeploy('FLAction');
        await redeploy('SendToken');
        await redeploy('RecipeExecutor');
    });

    it('... should get a MorphoBlue flash loan', async () => {
        await flMorphoBlueTest();
        await flMorphoBlueTest(true);
    });
});
