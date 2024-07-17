const { resetForkToBlock } = require('../utils');
const { offchainExchangeFullTest } = require('./offchain/offchain-tests');
const { onchainExchangeFullTest } = require('./onchain/onchain-tests');

describe('Exchange full test', () => {
    it('... should do full exchange test', async () => {
        await resetForkToBlock();
        await offchainExchangeFullTest();
        await onchainExchangeFullTest();
    });
});
