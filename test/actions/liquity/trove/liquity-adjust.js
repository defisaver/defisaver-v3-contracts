const { liquityAdjustTest } = require('../liquity-tests');

describe('Liquity-Adjust', () => {
    it('... should test liquity adjust action', async () => {
        await liquityAdjustTest();
    });
});
