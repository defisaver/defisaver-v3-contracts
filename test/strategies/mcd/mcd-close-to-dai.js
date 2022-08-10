const { mcdCloseToDaiStrategyTest } = require('./mcd-tests');

describe('Mcd close to dai Strategy test', function () {
    this.timeout(80000);

    it('... test mcd close to dai strategy', async () => {
        await mcdCloseToDaiStrategyTest();
    }).timeout(50000);
});
