const { aaveClaimAAVETest } = require('./aave-tests');

describe('Aave-claim staked aave test', function () {
    this.timeout(150000);

    it('... should run full aave claim staked aave test', async () => {
        await aaveClaimAAVETest();
    });
});
