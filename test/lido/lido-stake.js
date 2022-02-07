const {
    redeploy,
} = require('../utils');
const { lidoStakeTest } = require('./lido-tests.js');

describe('Lido WETH staking', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('LidoStake');
    });

    it('... stake 10 WETH to LIDO', async () => {
        await lidoStakeTest();
    }).timeout(50000);
});
