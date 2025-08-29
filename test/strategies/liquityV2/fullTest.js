const runBoostTests = require("./boostTest");
const runRepayTests = require("./repayTest");
const runCloseTests = require("./closeTest");

(async () => {
    await runBoostTests();
    await runRepayTests();
    await runCloseTests();
})();
