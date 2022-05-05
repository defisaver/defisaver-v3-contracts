const { continuousUniV3CollectStrategyTest } = require('./uni-tests');

describe('Uni continuous collect Strategy test', function () {
    this.timeout(80000);

    it('... test uni continuous collect strategy', async () => {
        await continuousUniV3CollectStrategyTest();
    }).timeout(50000);
});
