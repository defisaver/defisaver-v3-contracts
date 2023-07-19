const {
    redeploy,
} = require('../utils');
const { uniswapV3FlashloanTest } = require('./fl-tests');

describe('FL-UniV3', function () {
    this.timeout(60000);

    before(async () => {
        await redeploy('FLUniV3');
        await redeploy('SendTokens');
        await redeploy('RecipeExecutor');
    });

    it('... should get a UniswapV3 flash loan', async () => {
        await uniswapV3FlashloanTest();
    });
});
