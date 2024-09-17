const { odosTest } = require('./offchain-tests');

describe('Dfs-Sell', function () {
    this.timeout(140000);

    it('... should swap via Odos offchain aggregator using their API and OdosWrapper', async () => {
        await odosTest();
    });
});
