const {
    redeploy,
} = require('../utils');
const { pullTokenTest } = require('./utils-actions-tests');

describe('Pull-Token', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('PullToken');
    });

    it('... should pull tokens uint256.max direct action', async () => {
        await pullTokenTest();
    });
});
