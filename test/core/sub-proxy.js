const { subProxyTest } = require('./core-tests');

describe('Sub-Proxy', () => {
    it('... should test subProxy', async () => {
        await subProxyTest();
    }).timeout(50000);
});
