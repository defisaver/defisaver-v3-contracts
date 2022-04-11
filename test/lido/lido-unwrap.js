const {
    redeploy,
} = require('../utils');
const { lidoUnwrapTest } = require('./lido-tests');

describe('Lido WETH staking', function () {
    this.timeout(80000);
    before(async () => {
        await redeploy('LidoStake');
        await redeploy('LidoWrap');
        await redeploy('LidoUnwrap');
    });

    it('... directly transform 10 WETH to WstEth and then unwrap into StEth', async () => {
        await lidoUnwrapTest();
    }).timeout(50000);
});
