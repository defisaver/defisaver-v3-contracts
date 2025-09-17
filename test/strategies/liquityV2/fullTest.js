const runBoostTests = require('./boostTest');
const runRepayTests = require('./repayTest');
const runCloseTests = require('./closeTest');
const runInterestRateAdjustmentTests = require('./interestRateAdjustmentTest');

(async () => {
    // await runBoostTests();
    // await runRepayTests();
    // await runCloseTests();
    await runInterestRateAdjustmentTests();
})();
