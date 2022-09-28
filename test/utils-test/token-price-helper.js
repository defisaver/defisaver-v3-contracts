const {
    redeploy,
} = require('../utils');
const { tokenPriceHelperTest } = require('./utils-tests');

describe('Token-Price-Helper', function () {
    this.timeout(80000);

    before(async () => {
        /// @dev don't run dfs-registry-controller before this
        await redeploy('TokenPriceHelper');
    });

    it('... should test Token Price Helper contracts', async () => {
        await tokenPriceHelperTest();
    });
});
