const { botAuthTest } = require('./core-tests');

describe('Bot-Auth', () => {
    it('... should test botAuth', async () => {
        await botAuthTest();
    }).timeout(50000);
});
