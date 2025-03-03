const { zeroxTest } = require('./offchain-tests');

describe('Dfs-Sell', function () {
    this.timeout(140000);

    it('... should swap via 0x offchain aggregator using their API and ZeroxWrapper', async () => {
        await zeroxTest();
    });
});
