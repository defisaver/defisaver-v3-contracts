const {
    redeploy,
} = require('../utils');
const { permitTokenTest } = require('./utils-actions-tests');

describe('Permit-Token', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('PermitToken');
    });

    it('... should test PermitToken action', async () => {
        await permitTokenTest();
    });
});
