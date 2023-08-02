const { aaveV2RepayTest } = require('./aave-tests');

describe('Aave Repay Strategy test', function () {
    this.timeout(80000);

    it('... test aave repay strategy', async () => {
        await aaveV2RepayTest();
    }).timeout(50000);
});
