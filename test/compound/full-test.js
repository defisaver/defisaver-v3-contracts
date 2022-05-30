const { resetForkToBlock } = require('../utils');
const { compoundFullTest, compoundCollateralAssets } = require('./comp-tests');

const config = require('../../hardhat.config');

describe('Compound full test', () => {
    it('... should do full Compound test', async () => {
        await resetForkToBlock();
        let testLength = compoundCollateralAssets.length;
        if (config.lightTesting) testLength = 2;
        await compoundFullTest(testLength);
    });
});
