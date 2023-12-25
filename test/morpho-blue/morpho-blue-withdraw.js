const { morphoBlueWithdrawTest } = require('./morpho-blue-tests');

describe('Morpho-Blue-Withdraw', function () {
    this.timeout(800000);

    it('... should test MorphoBlue withdraw', async () => {
        await morphoBlueWithdrawTest();
    });
});
