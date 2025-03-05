const { oneInchTest } = require('./offchain-tests');

describe('Dfs-Sell', function () {
    this.timeout(140000);

    it('... should swap via 1inch offchain aggregator using their API and OneInchWrapper', async () => {
        await oneInchTest();
    });
});
