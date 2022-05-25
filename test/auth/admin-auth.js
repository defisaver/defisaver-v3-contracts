const {
    redeploy,
} = require('../utils');

const { adminAuthTest } = require('./auth-tests');

describe('Admin-Auth', () => {
    before(async () => {
        await redeploy('AdminAuth');
    });

    it('... owner should withdraw 10 Dai from contract', async () => {
        await adminAuthTest();
    });
});
