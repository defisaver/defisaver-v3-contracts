const { instaFullTest } = require('./insta-tests');

describe('Instadapp full test', () => {
    it('... should do full Instadapp test', async () => {
        await instaFullTest();
    });
});
