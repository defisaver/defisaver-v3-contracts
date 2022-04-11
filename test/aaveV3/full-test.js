const { aaveV3FullTest } = require('./aave-tests');

describe('Aave full test', () => {
    it('... should do full Aave test', async () => {
        await aaveV3FullTest();
    });
});
