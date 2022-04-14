const {
    redeploy,
} = require('../utils');
const { updateSubDataTest } = require('./utils-actions-tests');

describe('Unwrap-Eth', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('UpdateSub');
    });
    it('... should unwrap native WEth to Eth direct action', async () => {
        await updateSubDataTest();
    });
});
