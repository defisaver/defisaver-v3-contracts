const { redeploy } = require('../../utils');
const { uniV3WithdrawTest } = require('./univ3-tests');

describe('Uni-Supply-V3', () => {
    before(async () => {
        await redeploy('UniSupplyV3');
    });
    it('... should Log event', async () => {
        await uniV3WithdrawTest();
    }).timeout(50000);
});
