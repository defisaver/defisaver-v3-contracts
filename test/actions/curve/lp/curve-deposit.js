const { curveDepositTest } = require('../curve-tests');

describe('Curve-Deposit', () => {
    it('... should test curve lp deposit', async () => {
        await curveDepositTest(100);
    });
});
