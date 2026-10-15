const { resetForkToBlock } = require('../../utils/utils');
const { offchainExchangeFullTest } = require('./offchain-tests');

describe('Offchain exchange full test', () => {
    it('... should do full offchain exchange test', async () => {
        await resetForkToBlock();
        await offchainExchangeFullTest();
    });
});
