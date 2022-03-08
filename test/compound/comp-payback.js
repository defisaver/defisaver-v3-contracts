const { compoundCollateralAssets } = require('@defisaver/tokens');
const {
    redeploy,
} = require('../utils');
const { compPaybackTest } = require('./comp-tests');

describe('Comp-Payback', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompSupply');
        await redeploy('CompBorrow');
        await redeploy('CompPayback');
    });

    it('... should test Compound payback', async () => {
        await compPaybackTest(compoundCollateralAssets.length);
    });
});
