const { assets, getAssetInfo } = require('@defisaver/tokens');
const { resetForkToBlock } = require('../utils');
const { compoundFullTest } = require('./comp-tests');

// eslint-disable-next-line max-len
const compoundCollateralAssets = assets.filter((a) => a.compoundCollateral).map((a) => getAssetInfo(a.symbol));

const config = require('../../hardhat.config.js');

describe('Compound full test', () => {
    it('... should do full Compound test', async () => {
        await resetForkToBlock();
        let testLength = compoundCollateralAssets.length;
        if (config.lightTesting) testLength = 2;
        await compoundFullTest(testLength);
    });
});
