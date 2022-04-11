const { curveGaugeDepositTest } = require('../curve-tests');

describe('Curve-Gauge-Deposit', () => {
    it('... should test curve gauge deposits', async () => {
        await curveGaugeDepositTest(100);
    });
});
