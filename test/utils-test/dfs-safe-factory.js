const { dfsSafeFactoryTest } = require('./utils-tests');

describe('DFS-Safe-Factory', function () {
    this.timeout(80000);

    before(async () => {
    });
    it('... test DFS Safe Factory use case', async () => {
        await dfsSafeFactoryTest();
    });
});
