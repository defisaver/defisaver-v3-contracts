const {
    redeploy,
} = require('../utils');
const { proxyPermissionTest } = require('./auth-tests');

describe('Proxy-Permission', () => {
    before(async () => {
        await redeploy('ProxyPermission');
    });

    it('... should through DSProxy give contract permission', async () => {
        await proxyPermissionTest();
    });
});
