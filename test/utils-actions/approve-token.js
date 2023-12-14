const {
    redeploy,
} = require('../utils');
const { approveTokenTest } = require('./utils-actions-tests');

describe('Approve-Token', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('ApproveToken');
    });

    it('... should test ApproveToken action', async () => {
        await approveTokenTest();
    });
});
