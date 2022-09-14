const { assets, getAssetInfo } = require('@defisaver/tokens');
const { resetForkToBlock } = require('../utils');
const { compoundFullTest } = require('./comp-tests');
const config = require('../../hardhat.config');

// eslint-disable-next-line max-len
const compoundCollateralAssets = assets.filter((a) => a.compoundCollateral).map((a) => getAssetInfo(a.symbol));

describe('Compound full test', () => {
    it('... should do full Compound test', async () => {
        await resetForkToBlock();
        let testLength = compoundCollateralAssets.length;
        if (config.lightTesting) testLength = 2;
        await compoundFullTest(testLength);
    });
});
