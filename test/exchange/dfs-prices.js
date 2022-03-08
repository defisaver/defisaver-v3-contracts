const { dfsPricesTest } = require('./exchange-tests');

describe('Dfs-Prices', function () {
    this.timeout(140000);

    it('... should check best price from DFSPrices contract', async () => {
        await dfsPricesTest();
    });
});
