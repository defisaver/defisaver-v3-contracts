const { instaClaimMakerTest } = require('./insta-tests');

describe('claim INST', function () {
    this.timeout(80000);
    before(async () => {
    });

    it('... claim INST', async () => {
        await instaClaimMakerTest();
    }).timeout(50000);
});
