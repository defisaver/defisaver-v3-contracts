const {
    redeploy,
} = require('../utils');
const { sendTokenAndUnwrapTest } = require('./utils-actions-tests');

describe('Send-Token-And-Unwrap', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('SendTokenAndUnwrap');
        await redeploy('WrapEth');
    });

    it('... should send token and unwrap direct action uint256.max', async () => {
        await sendTokenAndUnwrapTest();
    });
});
