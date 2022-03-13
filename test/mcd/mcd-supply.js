const { ilks } = require('@defisaver/tokens');

const {
    redeploy,
} = require('../utils');
const { mcdSupplyTest } = require('./mcd-tests');

describe('Mcd-Supply', function () {
    this.timeout(80000);
    before(async () => {
        await redeploy('McdOpen');
        await redeploy('McdSupply');
        await redeploy('McdView');
    });
    it('... should test fully Mcd Supply', async () => {
        await mcdSupplyTest(1);
    });
});
