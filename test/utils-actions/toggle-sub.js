const {
    redeploy,
} = require('../utils');
const { toggleSubDataTest } = require('./utils-actions-tests');

describe('Toggle-sub', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('ToggleSub');
    });
    it('... should activate/deactivate sub in an action', async () => {
        await toggleSubDataTest();
    });
});
