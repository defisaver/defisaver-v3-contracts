const { instCompDebtShiftTest } = require('./inst-recipes');

describe('Inst Aave Debt Shift test', function () {
    this.timeout(80000);

    it('... test insta aave shifting a position with debt recipe', async () => {
        await instCompDebtShiftTest();
    }).timeout(50000);
});
