const { rariFullTest } = require('./rari-tests');

describe('Rari full test', () => {
    it('... should do full Rari test', async () => {
        await rariFullTest();
    });
});
