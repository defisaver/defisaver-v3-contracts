const { dfsRegistryControllerTest } = require('./utils-tests');

describe('DFS-Registry-Controller', function () {
    this.timeout(80000);

    before(async () => {
    });
    it('... add to proxy pool and use that to assign new proxy', async () => {
        await dfsRegistryControllerTest();
    });
});
