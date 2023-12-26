const { morphoBlueSupplyCollateralTest } = require('./morpho-blue-tests');

describe('Morpho-Blue-Supply', function () {
    this.timeout(800000);

    it('... should test MorphoBlue supply collateral', async () => {
        await morphoBlueSupplyCollateralTest();
    });
});
