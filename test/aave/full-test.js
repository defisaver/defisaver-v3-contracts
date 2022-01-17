const { aaveV2assetsDefaultMarket } = require('../utils-aave');
const { aaveFullTest } = require('./aave-tests');

describe('Aave full test', () => {
    it('... should do full Aave test', async () => {
        await aaveFullTest(aaveV2assetsDefaultMarket.length);
    });
});
