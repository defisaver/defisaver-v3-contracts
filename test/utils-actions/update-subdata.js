const {
    redeploy,
} = require('../utils');
const { updateSubDataTest } = require('./utils-actions-tests');

describe('Update-sub-data', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('UpdateSub');
    });
    it('... should update sub data for a users subscription', async () => {
        await updateSubDataTest();
    });
});
