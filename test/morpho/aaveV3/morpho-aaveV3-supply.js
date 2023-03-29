const { morphoAaveV3SupplyTest } = require('./morpho-aaveV3-tests');

describe('Morpho-Aave-V3-Supply', function () {
    this.timeout(80000);

    it('... should test Morpho AaveV3 supply', async () => {
        await morphoAaveV3SupplyTest();
    });
});
