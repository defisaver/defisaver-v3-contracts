const { kyberTest } = require('./offchain-tests');

describe('Dfs-Sell', function () {
    this.timeout(140000);

    it('... should swap via Kyber offchain aggregator using their API and KyberAggregatorWrapper', async () => {
        await kyberTest();
    });
});
