const { cbRedeemTest } = require('./chicken-bonds-tests');
const { redeploy } = require('../../utils');

describe('CB-Redeem', () => {
    before(async () => {
        await redeploy('CBCreate');
        await redeploy('CBChickenIn');
        await redeploy('CBRedeem');
    });

    it('... should test redeeming of LUSD for bLUSD', async () => {
        await cbRedeemTest();
    });
});
