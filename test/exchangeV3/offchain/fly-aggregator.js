const { flyTest } = require('./offchain-tests');

describe('Dfs-Sell', function () {
    this.timeout(140000);

    it('... should swap via the fly api and the fly DEX aggregator using FlyWrapper', async () => {
        await flyTest();
    });
});
