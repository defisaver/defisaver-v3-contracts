const { liquityDebtInFrontRepayStrategyTest } = require('./liquity-tests');

describe('Liquity Debt in front Repay Strategy test', function () {
    this.timeout(80000);

    it('... test liquity debt in front repay strategy', async () => {
        await liquityDebtInFrontRepayStrategyTest();
    }).timeout(50000);
});
