const { strategyStorageTest } = require('./core-tests');

describe('Strategy-Storage', () => {
    it('... should test strategyStorage', async () => {
        await strategyStorageTest();
    }).timeout(50000);
});
