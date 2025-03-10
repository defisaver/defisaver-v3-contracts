const { liquityFullTest } = require('./liquity-tests');

describe('Liquity full test', () => {
    it('... should do full Liquity test', async () => {
        await liquityFullTest();
    });
});
