const {
    redeploy,
} = require('../utils');
const { mcdTokenConverterTest } = require('./mcd-tests');

describe('Mcd-Convert-tokens', function () {
    this.timeout(80000);
    before(async () => {
        await redeploy('McdTokenConverter');
    });
    it('... should test fully Mcd Token Converter action', async () => {
        await mcdTokenConverterTest();
    });
});
