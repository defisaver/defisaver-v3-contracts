const { subStorageTest } = require('./core-tests');

describe('Sub-Storage', () => {
    it('... should test subStorage', async () => {
        await subStorageTest();
    }).timeout(50000);
});
