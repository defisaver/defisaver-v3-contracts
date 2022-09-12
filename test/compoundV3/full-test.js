const { resetForkToBlock } = require('../utils');
const { compoundV3FullTest } = require('./compV3-tests');

describe('CompoundV3 full test', () => {
    it('... should do full CompoundV3 test', async () => {
        await resetForkToBlock();
        await compoundV3FullTest();
    });
});
