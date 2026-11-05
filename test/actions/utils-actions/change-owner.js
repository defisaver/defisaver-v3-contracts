const { redeploy } = require('../../utils/utils');
const { changeOwnerTest } = require('./utils-actions-tests');

describe('Change owner', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('DFSProxyRegistryV2');
        await redeploy('ChangeProxyOwner');
    });

    it('... should change owner back', async () => {
        await changeOwnerTest();
    });
});
