const {
    redeploy,
} = require('../utils');

const { aaveFlTest } = require('./fl-tests');

describe('FL-AaveV2', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('FLAaveV2');
        await redeploy('SendToken');
        await redeploy('TaskExecutor');
    });

    it('... should get an  AaveV2 flash loan', async () => {
        await aaveFlTest();
    });
});
