const { resetForkToBlock } = require('../utils/utils');
const { coreFullTest } = require('./core-tests');

describe('Core full test', () => {
    it('... should do full Core test', async () => {
        await resetForkToBlock();
        await coreFullTest();
    });
});
