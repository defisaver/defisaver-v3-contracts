const { ghoClaimAAVEtest } = require('./aave-tests');

describe('Aave-claim from stkGHO test', function () {
    this.timeout(150000);

    it('... should run full aave claim staked gho test', async () => {
        await ghoClaimAAVEtest();
    });
});
