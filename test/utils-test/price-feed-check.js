const { priceFeedTest } = require('./utils-tests');

describe('Price feed check', function () {
    this.timeout(80000);

    it('... should compare live values to those in feed .json files', async () => {
        await priceFeedTest();
    });
});
