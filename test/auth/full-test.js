const { authFullTest } = require('./auth-tests');

describe('Auth full test', () => {
    it('... should do full Auth test', async () => {
        await authFullTest();
    });
});
