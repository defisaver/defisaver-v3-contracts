const { morphoAaveV3WithdrawTest } = require('./morpho-aaveV3-tests');

describe('Morpho-Aave-V3-Withdraw', function () {
    this.timeout(80000);

    it('... should test Morpho AaveV3 withdraw', async () => {
        await morphoAaveV3WithdrawTest();
    });
});
