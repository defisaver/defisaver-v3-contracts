const {
    redeploy,
} = require('../utils');
const { unwrapEthTest } = require('./utils-actions-tests');

describe('Unwrap-Eth', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('WrapEth');
        await redeploy('UnwrapEth');
        await redeploy('DFSSell');
        await redeploy('UniswapWrapperV3');
        await redeploy('RecipeExecutor');
    });
    it('... should unwrap native WEth to Eth direct action', async () => {
        await unwrapEthTest();
    });
});
