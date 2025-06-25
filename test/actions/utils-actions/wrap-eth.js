const {
    redeploy,
} = require('../../utils/utils');

const { wrapEthTest } = require('./utils-actions-tests');

describe('Wrap-Eth', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('WrapEth');
        await redeploy('DFSSell');
        await redeploy('UniswapWrapperV3');
        await redeploy('RecipeExecutor');
    });
    it('... should wrap native Eth to Weth direct action', async () => {
        await wrapEthTest();
    });
});
