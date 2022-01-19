const { resetForkToBlock } = require('../utils');
const { fullFLTest } = require('./fl-tests');

describe('Flashloans full test', () => {
    it('... should do full flashloan test', async () => {
        await resetForkToBlock();
        await fullFLTest();
    });
});
