const { curveClaimFeesTest } = require('./curve-tests');

describe('Curve-Claim-Fees', () => {
    it('... should test curve claim fees', async () => {
        await curveClaimFeesTest();
    });
});
