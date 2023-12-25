const { redeploy } = require('../utils');
const { morphoBlueSupplyTest } = require('./morpho-blue-tests');

describe('Morpho-Blue-Supply', function () {
    this.timeout(800000);
    before(async () => {
        await redeploy('MorphoBlueSupply');
    });

    it('... should test MorphoBlue supply', async () => {
        await morphoBlueSupplyTest();
    });
});
