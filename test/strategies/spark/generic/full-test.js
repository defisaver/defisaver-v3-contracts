const { runRepayTests } = require('./repay');
const { runBoostTests } = require('./boost');
const { runRepayOnPriceTests } = require('./repay-on-price');
const { runBoostOnPriceTests } = require('./boost-on-price');
const { runSparkCollSwitchTests } = require('./collateral-switch');

describe('Spark Generic Strategy Tests', () => {
    runRepayTests();
    runBoostTests();
    runRepayOnPriceTests();
    runBoostOnPriceTests();
    runSparkCollSwitchTests();
});
