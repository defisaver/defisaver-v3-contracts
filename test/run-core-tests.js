// helper file to run all core test files
const { authFullTest } = require('./auth/auth-tests');
const { coreFullTest } = require('./core/core-tests');

describe('Core full test', () => {
    it('... should do full Core test', async () => {
        await authFullTest();
        await coreFullTest();
    });
});
