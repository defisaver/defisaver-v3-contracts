const { liquityCloseToCollStrategyTest } = require('./liquity-tests');

describe('Liquity Close to coll Strategy test', function () {
    this.timeout(80000);

    it('... test liquity close to coll strategy', async () => {
        await liquityCloseToCollStrategyTest();
    }).timeout(50000);
});
