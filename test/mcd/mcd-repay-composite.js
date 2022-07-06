const { ilks } = require('@defisaver/tokens');

const {
    redeploy,
} = require('../utils');
const { mcdRepayCompositeTest } = require('./mcd-tests');

describe('Mcd-Repay-Composite', function () {
    this.timeout(4000000);

    before(async () => {
        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdOpen');
        await redeploy('McdGenerate');
        await redeploy('McdSupply');
        await redeploy('McdView');
        await redeploy('McdRepayComposite');
    });

    it('... should test mcd repay composite action', async () => {
        await mcdRepayCompositeTest(ilks.length);
    });
});
