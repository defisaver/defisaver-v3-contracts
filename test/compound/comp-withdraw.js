const {
    redeploy,
} = require('../utils');
const { compWithdrawTest, compoundCollateralAssets } = require('./comp-tests');

describe('Comp-Withdraw', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompSupply');
        await redeploy('CompWithdraw');
    });

    it('... should test Compound withdraw', async () => {
        await compWithdrawTest(compoundCollateralAssets.length);
    });
});
