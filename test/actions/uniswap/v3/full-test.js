const { uniV3FullTest } = require('./univ3-tests');

describe('Uniswap V3 full test', () => {
    it('... should do full Uniswap V3 test', async () => {
        await uniV3FullTest();
    });
});
