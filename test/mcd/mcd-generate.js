const { ilks } = require('@defisaver/tokens');
const {
    redeploy,
} = require('../utils');
const { mcdGenerateTest } = require('./mcd-tests');

describe('Mcd-Generate', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('McdOpen');
        await redeploy('McdSupply');
        await redeploy('McdView');
        await redeploy('McdGenerate');
    });

    it('... should do full Maker Generate test', async () => {
        await mcdGenerateTest(1);
    });
});
