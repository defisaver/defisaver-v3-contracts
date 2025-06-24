const { liquitySPWithdrawTest } = require('../liquity-tests');

describe('Liquity-SP-Withdraw', () => {
    it('... should test withdrawing from liquity stability pool', async () => {
        await liquitySPWithdrawTest();
    });
});
