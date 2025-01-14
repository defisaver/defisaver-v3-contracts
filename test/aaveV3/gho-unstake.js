const { ghoUnstakeTest } = require('./aave-tests');

describe('Unstake staked gho test', function () {
    this.timeout(150000);

    it('... should run full gho unstake test', async () => {
        await ghoUnstakeTest();
    });
});
