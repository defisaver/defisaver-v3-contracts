const {
    redeploy,
} = require('../utils');
const { compSupplyTest, compoundCollateralAssets } = require('./comp-tests');

describe('Comp-Supply', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('CompSupply');
    });

    it('... should test Compound supply', async () => {
        await compSupplyTest(compoundCollateralAssets.length);
    });
});
