const { ilks } = require('@defisaver/tokens');

const {
    redeploy, resetForkToBlock,
} = require('../utils');
const { mcdBoostCompositeTest } = require('./mcd-tests');

describe('Mcd-Boost-Composite', function () {
    this.timeout(4000000);

    before(async () => {
        await resetForkToBlock(15102400);

        await redeploy('McdSupply');
        await redeploy('McdWithdraw');
        await redeploy('McdOpen');
        await redeploy('McdGenerate');
        await redeploy('McdSupply');
    });

    it('... should test mcd boost composite action', async () => {
        await mcdBoostCompositeTest(ilks.length);
    });
});
