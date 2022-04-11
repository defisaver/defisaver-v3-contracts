const {
    redeploy,
} = require('../utils.js');
const { adminVaultTest } = require('./auth-tests.js');

describe('Admin-Vault', () => {
    before(async () => {
        await redeploy('AdminVault');
    });

    it('... should fail to change the admin address if not called by admin', async () => {
        await adminVaultTest();
    });
});
