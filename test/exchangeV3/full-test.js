const { offchainExchangeFullTest } = require('./offchain/offchain-tests');
const { onchainExchangeFullTest } = require('./onchain/onchain-tests');

describe('Exchange full test', () => {
    offchainExchangeFullTest();
    onchainExchangeFullTest();
});
