const { instaPullTokensTest } = require('./insta-tests');

describe('Pull tokens from DSA', function () {
    this.timeout(80000);
    /// @notice run on block number 12805354
    before(async () => {
    });

    it('... pull aUni, aWETH, aDAI tokens from dsa', async () => {
        await instaPullTokensTest();
    }).timeout(50000);
});
