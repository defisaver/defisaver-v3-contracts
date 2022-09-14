const {
    redeploy,
} = require('../utils');
const { compV3TransferTest } = require('./compV3-tests');

describe('CompV3-Transfer', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompV3Transfer');
    });

    it('... should test CompoundV3 transfer', async () => {
        await compV3TransferTest();
    });
});
