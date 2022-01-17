const { uniFullTest } = require('./uni-tests');

describe('Uniswap V2 full test', () => {
    it('... should do full Uniswap V2 test', async () => {
        await uniFullTest();
    });
});
