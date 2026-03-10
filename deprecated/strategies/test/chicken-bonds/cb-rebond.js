const { cbRebondStrategyTest } = require('./cb-tests');

describe('Chicken Bond Rebond Strategy test', function () {
    this.timeout(80000);

    it('... test chicken bond rebond strategy', async () => {
        await cbRebondStrategyTest();
    }).timeout(50000);
});
