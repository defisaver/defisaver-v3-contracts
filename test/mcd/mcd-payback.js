const { ilks } = require('@defisaver/tokens');

const {
    redeploy,
} = require('../utils');

const { mcdPaybackTest } = require('./mcd-tests');

describe('Mcd-Payback', function () {
    this.timeout(40000);

    before(async () => {
        await redeploy('McdOpen');
        await redeploy('McdSupply');
        await redeploy('McdGenerate');
        await redeploy('McdPayback');
        await redeploy('McdView');
    });

    it('... should payback DAI for vault', async () => {
        await mcdPaybackTest(1);
    });
});
