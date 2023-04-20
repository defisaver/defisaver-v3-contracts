const { paraswapTest } = require('./exchange-tests');

describe('Dfs-Sell', function () {
    this.timeout(140000);

    it('... should swap via Paraswap offchain aggregator using their API and ParaswapWrapper', async () => {
        await paraswapTest();
    });
});
