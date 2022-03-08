const { curveGaugeWithdrawTest } = require('../curve-tests');

describe('Curve-Gauge-Withdraw', () => {
    it('... should test curve gauge withdraw', async () => {
        await curveGaugeWithdrawTest(100);
    });
});
