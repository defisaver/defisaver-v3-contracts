const { uinV3RangeOrderStrategyTest } = require('./uni-tests');

describe('Uni range order Strategy test', function () {
    this.timeout(80000);

    it('... test range order strategy', async () => {
        await uinV3RangeOrderStrategyTest();
    }).timeout(50000);
});
