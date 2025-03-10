const { liquityUnstakeTest } = require('../liquity-tests');

describe('Liquity-Untake', () => {
    it('... should test unstaking lqty', async () => {
        await liquityUnstakeTest();
    });
});
