const { liquitySupplyTest } = require('../liquity-tests');

describe('Liquity-Supply', () => {
    it('... should test supplying collateral to a liquity trove', async () => {
        await liquitySupplyTest();
    });
});
