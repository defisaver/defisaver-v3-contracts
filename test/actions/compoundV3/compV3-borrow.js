const {
    redeploy,
} = require('../../utils/utils');
const { compV3BorrowTest } = require('./compV3-tests');

describe('CompV3-Borrow', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompV3Borrow');
    });

    it('... should test CompoundV3 borrow', async () => {
        await compV3BorrowTest();
    });
});
