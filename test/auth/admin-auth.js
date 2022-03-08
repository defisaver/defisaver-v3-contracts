const {
    redeploy,
} = require('../utils.js');

const { adminAuthTest } = require('./auth-tests.js');

describe('Admin-Auth', () => {
    before(async () => {
        await redeploy('AdminAuth');
    });

    it('... owner should withdraw 10 Dai from contract', async () => {
        await adminAuthTest();
    });
});
