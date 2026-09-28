const { openOceanTest } = require('./offchain-tests');

describe('Dfs-Sell', function () {
    this.timeout(140000);

    it('... should swap via OpenOcean offchain aggregator using their API and OpenOceanWrapper', async () => {
        await openOceanTest();
    });
});
