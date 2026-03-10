const { liquityOpenTest } = require('../liquity-tests');

describe('Liquity-Open', () => {
    it('... should test opening a liquity trove', async () => {
        await liquityOpenTest();
    });
});
