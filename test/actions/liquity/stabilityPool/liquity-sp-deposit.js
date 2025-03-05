const { liquitySPDepositTest } = require('../liquity-tests');

describe('Liquity-SP-Deposit', () => {
    it('... should test depositing into liquity stability pool', async () => {
        await liquitySPDepositTest();
    });
});
