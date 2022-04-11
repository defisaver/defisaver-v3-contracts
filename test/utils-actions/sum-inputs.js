const {
    redeploy,
} = require('../utils');
const { sumInputsTest } = require('./utils-actions-tests');

describe('Sum-Inputs', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('PullToken');
        await redeploy('SumInputs');
        await redeploy('RecipeExecutor');
    });

    it('... should revert in event of overflow', async () => {
        await sumInputsTest();
    });
});
