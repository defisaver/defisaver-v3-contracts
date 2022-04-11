const { dfsSellTest } = require('./exchange-tests');

// TODO: check stuff like price and slippage
// TODO: can we make it work with 0x?

describe('Dfs-Sell', function () {
    this.timeout(140000);

    it('... should check best price from DFSPrices contract', async () => {
        await dfsSellTest();
    });
});
