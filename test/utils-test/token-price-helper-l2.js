const {
    redeploy,
} = require('../utils');
const { tokenPriceHelperL2Test } = require('./utils-tests');

describe('Token-Price-Helper-L2', function () {
    this.timeout(80000);

    before(async () => {
        /// @dev don't run dfs-registry-controller before this
        await redeploy('GasFeeTakerL2');
    });

    it('... should test Token Price Helper contracts', async () => {
        await tokenPriceHelperL2Test();
    });
});
