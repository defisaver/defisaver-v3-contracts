const { compoundCollateralAssets } = require('@defisaver/tokens');
const { compoundFullTest } = require('./comp-tests');

describe('Compound full test', () => {
    it('... should do full Compound test', async () => {
        await compoundFullTest(compoundCollateralAssets.length);
    });
});
