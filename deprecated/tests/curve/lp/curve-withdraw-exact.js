const { curveWithdrawExactTest } = require('../curve-tests');

describe('Curve-Withdraw-Exact', () => {
    it('... should test curve lp withdraw (exact)', async () => {
        await curveWithdrawExactTest(100);
    });
});
