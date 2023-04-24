const { dfsSellTest } = require('./exchange-tests');

describe('Dfs-Sell', function () {
    this.timeout(140000);

    it('... should check best price from DFSPrices contract', async () => {
        await dfsSellTest();
    });
});
