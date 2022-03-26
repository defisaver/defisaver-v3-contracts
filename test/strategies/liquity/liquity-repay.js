const { liquityRepayStrategyTest } = require('./liquity-tests');

describe('Liquity Repay Strategy test', function () {
    this.timeout(80000);

    it('... test liquity repay strategy', async () => {
        await liquityRepayStrategyTest();
    }).timeout(50000);
});
