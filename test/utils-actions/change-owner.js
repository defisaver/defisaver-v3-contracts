const {
    redeploy,
} = require('../utils');
const { changeOwnerTest } = require('./utils-actions-tests');

describe('Change owner', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('ChangeProxyOwner');
    });

    it('... should change owner back', async () => {
        await changeOwnerTest();
    });
});
