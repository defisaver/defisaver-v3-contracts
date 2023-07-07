const {
    redeploy,
} = require('../utils');

const { sparkFlTest } = require('./fl-tests');

describe('FL-Spark', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('FLSpark');
        await redeploy('SendToken');
        await redeploy('RecipeExecutor');
    });

    it('... should get an  Spark flash loan', async () => {
        await sparkFlTest();
    });
});
