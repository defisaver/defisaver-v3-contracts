const { liquityStakeTest } = require('../liquity-tests');

describe('Liquity-Stake', () => {
    it('... should test staking lqty', async () => {
        await liquityStakeTest();
    });
});
