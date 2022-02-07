const {
    redeploy,
} = require('../utils');
const { reflexerWithdrawTest } = require('./reflexer-tests');

describe('Reflexer-Withdraw', () => {
    before(async () => {
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerWithdraw');
        await redeploy('ReflexerView');
    });

    it('... should do full Reflexer Withdraw test', async () => {
        await reflexerWithdrawTest();
    }).timeout(40000);
});
