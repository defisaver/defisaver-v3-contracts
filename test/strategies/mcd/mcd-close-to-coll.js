const { mcdCloseToCollStrategyTest } = require('./mcd-tests');

describe('Mcd close to coll Strategy test', function () {
    this.timeout(80000);

    it('... test mcd close to coll strategy', async () => {
        await mcdCloseToCollStrategyTest();
    }).timeout(50000);
});
