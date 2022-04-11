const { liquityRedeemTest } = require('./liquity-tests');

describe('Liquity-Redeem', () => {
    it('... should test redeeming lusd for ETH collateral', async () => {
        await liquityRedeemTest();
    });
});
