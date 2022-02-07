const { resetForkToBlock } = require('../utils');
const { aaveV2assetsDefaultMarket } = require('../utils-aave');
const { aaveFullTest } = require('./aave-tests');

const config = require('../../hardhat.config.js');

describe('Aave full test', () => {
    it('... should do full Aave test', async () => {
        await resetForkToBlock();
        let testLength = aaveV2assetsDefaultMarket.length;
        if (config.lightTesting) testLength = 2;
        await aaveFullTest(testLength);
    });
});
