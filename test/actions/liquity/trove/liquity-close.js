const { liquityCloseTest } = require('../liquity-tests');

describe('Liquity-Close', () => {
    it('... should test closing a liquity trove', async () => {
        await liquityCloseTest();
    });
});
