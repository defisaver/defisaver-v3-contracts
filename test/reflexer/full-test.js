const { reflexerFullTest } = require('./reflexer-tests');

describe('Reflexer full test', () => {
    it('... should do full Reflexer test', async () => {
        await reflexerFullTest();
    });
});
