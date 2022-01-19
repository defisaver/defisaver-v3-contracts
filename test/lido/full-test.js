const { resetForkToBlock } = require('../utils');
const { lidoFullTest } = require('./lido-tests');

describe('Lido full test', () => {
    it('... should do full Lido test', async () => {
        await resetForkToBlock();
        await lidoFullTest();
    });
});
