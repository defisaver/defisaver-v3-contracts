const {
    redeploy,
} = require('../utils');
const { subInputsTest } = require('./utils-actions-tests');

describe('Sub-Inputs', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('PullToken');
        await redeploy('SubInputs');
        await redeploy('TaskExecutor');
    });

    it('... should revert in event of overflow', async () => {
        await subInputsTest();
    });
});
