const { mStableFullTest } = require('./mstable-tests');

describe('Mstable full test', () => {
    it('... should do full Mstable test', async () => {
        await mStableFullTest();
    });
});
