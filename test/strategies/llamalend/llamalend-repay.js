const { resetForkToBlock } = require('../../utils');

describe('Llamalend Repay Strategy test', function () {
    this.timeout(80000);

    it('... test llamalend repay strategy', async () => {
        await resetForkToBlock();
        // await curveUsdBoostStrategyTest();
    }).timeout(150000);
});
