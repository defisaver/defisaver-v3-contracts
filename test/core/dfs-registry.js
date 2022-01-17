const { dfsRegistryTest } = require('./core-tests');

describe('DFS-Registry', () => {
    it('... should test dfsRegistry', async () => {
        await dfsRegistryTest();
    }).timeout(50000);
});
