const { yearnFullTest } = require('./yearn-tests');

describe('Utils full test', () => {
    it('... should do full Utils test', async () => {
        await yearnFullTest(0);
    });
});
