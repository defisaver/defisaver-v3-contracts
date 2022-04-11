const {
    redeploy,
} = require('../utils');

const { lidoStakeTest } = require('./lido-tests');

describe('Lido WStEth', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('LidoStake');
        await redeploy('LidoWrap');
    });

    it('... stake 10 WETH to LIDO and then wrap them', async () => {
        await lidoStakeTest();
    }).timeout(50000);
});
