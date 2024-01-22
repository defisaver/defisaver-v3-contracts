const { dsProxyAuthTest } = require('./core-tests');

describe('DSProxy-Auth', () => {
    it('... should test dsProxyAuth', async () => {
        await dsProxyAuthTest();
    }).timeout(50000);
});
