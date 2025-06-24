const { ilks } = require('@defisaver/tokens');

const {
    redeploy, resetForkToBlock,
} = require('../../utils/utils');
const { mcdRepayCompositeTest } = require('./mcd-tests');

describe('Mcd-Repay-Composite', function () {
    this.timeout(4000000);

    before(async () => {
        await resetForkToBlock(15000000);

        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdOpen');
        await redeploy('McdGenerate');
        await redeploy('McdSupply');
    });

    it('... should test mcd repay composite action', async () => {
        await mcdRepayCompositeTest(ilks.length);
    });
});
