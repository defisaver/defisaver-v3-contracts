const {
    redeploy,
} = require('../utils');
const { reflexerWithdrawStuckFundsTest } = require('./reflexer-tests');

describe('Reflexer-Withdraw-Stuck-Funds', () => {
    before(async () => {
        await redeploy('ReflexerWithdrawStuckFunds');
    });

    it('... should do a full Reflexer Withdraw stuck funds test', async () => {
        await reflexerWithdrawStuckFundsTest();
    }).timeout(400000);
});
