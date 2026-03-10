const { curveWithdrawTest } = require('../curve-tests');

describe('Curve-Withdraw', () => {
    it('... should test curve lp withdraw', async () => {
        await curveWithdrawTest(100);
    });
});
