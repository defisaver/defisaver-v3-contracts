const { compoundCollateralAssets } = require('@defisaver/tokens');
const { resetForkToBlock } = require('../utils');
const { compoundFullTest } = require('./comp-tests');

const config = require('../../hardhat.config.js');

describe('Compound full test', () => {
    it('... should do full Compound test', async () => {
        await resetForkToBlock();
        let testLength = compoundCollateralAssets.length;
        if (config.lightTesting) testLength = 2;
        await compoundFullTest(testLength);
    });
});
