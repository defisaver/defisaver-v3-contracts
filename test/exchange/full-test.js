const { resetForkToBlock } = require('../utils');
const { dfsExchangeFullTest } = require('./exchange-tests');

describe('Exchange full test', () => {
    it('... should do full exchange test', async () => {
        await resetForkToBlock();
        await dfsExchangeFullTest();
    });
});
