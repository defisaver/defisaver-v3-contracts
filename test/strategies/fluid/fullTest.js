const runRepayTests = require('./repayTest');
const runBoostTests = require('./boostTest');

(async () => {
    await runRepayTests();
    await runBoostTests();
})();
