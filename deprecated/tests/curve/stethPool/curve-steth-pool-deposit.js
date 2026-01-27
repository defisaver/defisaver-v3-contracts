const { curveStethPoolDepositTest } = require('../curve-tests');

describe('Curve-Steth-Pool-Deposit', () => {
    it('... should test Curve stEth pool deposit', async () => {
        await curveStethPoolDepositTest();
    });
});
