const { redeploy } = require("../../utils/utils");
const { reflexerSupplyTest } = require("./reflexer-tests");

describe("Reflexer-Supply", () => {
    before(async () => {
        await redeploy("ReflexerOpen");
        await redeploy("ReflexerSupply");
        await redeploy("ReflexerView");
    });

    it("... should do a full Reflexer Supply test", async () => {
        await reflexerSupplyTest();
    }).timeout(400000);
});
