const {
    redeploy,
} = require('../utils');
const { dsProxyPermissionTest } = require('./auth-tests');

describe('DSProxy-Permission', () => {
    before(async () => {
        await redeploy('DSProxyPermission');
    });

    it('... should through DSProxy give contract permission', async () => {
        await dsProxyPermissionTest();
    });
});
