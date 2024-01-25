const { proxyAuthTest } = require('./core-tests');

describe('Proxy-Auth', () => {
    it('... should test proxyAuth', async () => {
        await proxyAuthTest();
    }).timeout(50000);
});
