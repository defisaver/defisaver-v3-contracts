const { curveWithdrawOneCoinTest } = require('../curve-tests');

describe('Curve-Withdraw-One-Coin', () => {
    it('... should test curve lp withdraw one coin', async () => {
        await curveWithdrawOneCoinTest(100);
    });
});
