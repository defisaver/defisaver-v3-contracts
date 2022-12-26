const { liquityCBPaybackTest } = require('./liquity-tests');

describe('Liquity Payback from Chicken Bonds Strategy test', function () {
    this.timeout(80000);

    it('... test liquity payback from chicken bonds strategy', async () => {
        await liquityCBPaybackTest();
    }).timeout(50000);
});
