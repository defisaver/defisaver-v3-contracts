const {
    redeploy,
} = require('../utils');

const { aaveV3FlTest } = require('./fl-tests');

describe('FL-AaveV3', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('FLAaveV3');
        await redeploy('SendToken');
        await redeploy('RecipeExecutor');
    });

    it('... should get an  AaveV3 flash loan', async () => {
        await aaveV3FlTest();
    });
});
