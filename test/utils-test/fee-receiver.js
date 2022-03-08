const {
    redeploy,
} = require('../utils');
const { feeReceiverTest } = require('./utils-tests');

describe('Fee-Receiver', function () {
    this.timeout(80000);

    before(async () => {
        /// @dev don't run dfs-registry-controller before this
        await redeploy('FeeReceiver');
    });

    it('... should fail to withdraw Eth as the caller is not admin', async () => {
        await feeReceiverTest();
    });
});
