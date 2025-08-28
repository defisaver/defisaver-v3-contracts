const { resetForkToBlock } = require("../utils/utils");
const { authFullTest } = require("./auth-tests");

describe("Auth full test", () => {
    it("... should do full Auth test", async () => {
        await resetForkToBlock();
        await authFullTest();
    });
});
