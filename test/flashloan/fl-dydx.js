const {
    redeploy,
} = require('../utils');
const { dydxFLTest } = require('./fl-tests');

describe('FL-DyDx', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('FLDyDx');
        await redeploy('SendToken');
        await redeploy('TaskExecutor');
    });

    it('... should get DyDx flash loan', async () => {
        await dydxFLTest();
    });
});
