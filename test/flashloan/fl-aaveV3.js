const { aaveV3FlTest } = require('./fl-tests');

describe('FL-AaveV3', function () {
    this.timeout(60000);

    it('... should get an  AaveV3 flash loan', async () => {
        await aaveV3FlTest();
    });
});
