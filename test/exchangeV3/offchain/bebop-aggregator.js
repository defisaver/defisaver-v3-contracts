const { bebopTest } = require('./offchain-tests');

describe('Dfs-Sell', function () {
    this.timeout(140000);

    it('... should swap via Bebop offchain aggregator using their API and BebopWrapper', async () => {
        await bebopTest();
    });
});
