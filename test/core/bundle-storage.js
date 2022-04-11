const { bundleStorageTest } = require('./core-tests');

describe('Bundle-Storage', () => {
    it('... should test botAuth', async () => {
        await bundleStorageTest();
    }).timeout(50000);
});
