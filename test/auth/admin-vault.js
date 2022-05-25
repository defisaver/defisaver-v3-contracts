const {
    redeploy,
} = require('../utils');
const { adminVaultTest } = require('./auth-tests');

describe('Admin-Vault', () => {
    before(async () => {
        await redeploy('AdminVault');
    });

    it('... should fail to change the admin address if not called by admin', async () => {
        await adminVaultTest();
    });
});
