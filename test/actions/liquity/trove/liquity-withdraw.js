const { liquityWithdrawTest } = require('../liquity-tests');

describe('Liquity-Withdraw', () => {
    it('... should test withdrawing collateral from a liquity trove', async () => {
        await liquityWithdrawTest();
    });
});
