const { compoundCollateralAssets } = require('@defisaver/tokens');
const {
    redeploy,
} = require('../utils');
const { compBorrowTest } = require('./comp-tests');

describe('Comp-Borrow', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompSupply');
        await redeploy('CompBorrow');
    });

    it('... should test Compound borrow', async () => {
        await compBorrowTest(compoundCollateralAssets.length);
    });
});
