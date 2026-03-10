const { curveStethPoolWithdrawTest } = require('../curve-tests');

describe('Curve-Steth-Pool-Withdraw', () => {
    it('... should test Curve stEth pool withdraw', async () => {
        await curveStethPoolWithdrawTest();
    });
});
