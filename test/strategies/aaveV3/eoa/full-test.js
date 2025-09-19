const { runBoostTests } = require('./boost');
const { runRepayTests } = require('./repay');
const { runBoostOnPriceTests } = require('./boost-on-price');
const { runRepayOnPriceTests } = require('./repay-on-price');
const { runCloseTests } = require('./close');

describe('AaveV3  Full Strategy Tests', () => {
    runBoostTests();
    // runRepayTests();
    // runBoostOnPriceTests();
    // runRepayOnPriceTests();
    // runCloseTests();
});
