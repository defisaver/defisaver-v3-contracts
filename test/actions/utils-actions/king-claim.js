const { kingClaimTest } = require("./utils-actions-tests");

describe("King Claim test", function () {
    this.timeout(80000);

    it("... should try claiming KING token for a Smart wallet", async () => {
        await kingClaimTest();
    });
});
