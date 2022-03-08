const {
    redeploy,
} = require('../utils');
const { sendTokenTest } = require('./utils-actions-tests');

describe('Send-Token', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('WrapEth');
    });

    it('... should send tokens direct action uint256.max', async () => {
        await sendTokenTest();
    });
});
