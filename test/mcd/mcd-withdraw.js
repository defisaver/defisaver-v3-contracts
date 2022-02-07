const { ilks } = require('@defisaver/tokens');

const {
    redeploy,
} = require('../utils');
const { mcdWithdrawTest } = require('./mcd-tests');

describe('Mcd-Withdraw', function () {
    this.timeout(40000);

    before(async () => {
        await redeploy('McdWithdraw');
        await redeploy('McdOpen');
        await redeploy('McdGenerate');
        await redeploy('McdSupply');
    });

    it('... should withdraw  vault', async () => {
        await mcdWithdrawTest(ilks.length);
    });
});
