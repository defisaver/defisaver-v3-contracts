const { pendleRouterTest } = require("./offchain-tests");

describe("Dfs-Sell-via-Pendle-Router", function () {
    this.timeout(140000);

    it("... should swap via Pendle Router using their API and PendleWrapper", async () => {
        await pendleRouterTest();
    });
});
