const { runRepayTests } = require('./repay');
const { runBoostTests } = require('./boost');
const { runRepayOnPriceTests } = require('./repay-on-price');

describe('Spark Generic Strategy Tests', () => {
    runRepayTests();
    runBoostTests();
    runRepayOnPriceTests();
});
