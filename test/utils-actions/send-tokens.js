const {
    redeploy,
} = require('../utils');
const { sendTokensTest } = require('./utils-actions-tests');

describe('Send-Tokens-multiple-action', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('SendTokens');
        await redeploy('WrapEth');
        await redeploy('SendToken');
        await redeploy('RecipeExecutor');
    });

    it('... should send tokens using SendTokens action and compare gas prices', async () => {
        await sendTokensTest();
    });
});
