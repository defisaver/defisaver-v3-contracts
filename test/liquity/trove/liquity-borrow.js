const { liquityBorrowTest } = require('../liquity-tests');

describe('Liquity-Borrow', () => {
    it('... should test borrowing lusd from a liquity trove', async () => {
        await liquityBorrowTest();
    });
});
