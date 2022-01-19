const { instAaveNoDebtShiftTest } = require('./inst-recipes');

describe('Inst Aave Debt Shift test', function () {
    this.timeout(80000);

    it('... test insta aave shifting a position with debt recipe', async () => {
        await instAaveNoDebtShiftTest();
    }).timeout(50000);
});
