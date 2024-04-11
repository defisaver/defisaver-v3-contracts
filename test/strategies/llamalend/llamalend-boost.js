const { resetForkToBlock } = require('../../utils');

describe('Llamalend Boost Strategy test', function () {
    this.timeout(80000);

    it('... test llamalend boost strategy', async () => {
        await resetForkToBlock();
        // await curveUsdBoostStrategyTest();
    }).timeout(150000);
});
