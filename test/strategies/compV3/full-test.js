const { runBoostTests } = require('./boost');
const { runRepayTests } = require('./repay');
const { runBoostOnPriceTests } = require('./boost-on-price');
const { runRepayOnPriceTests } = require('./repay-on-price');
const { runCloseTests } = require('./close');

describe('CompV3 Full Strategy Tests', () => {
    runBoostTests();
    runRepayTests();
    runBoostOnPriceTests();
    runRepayOnPriceTests();
    runCloseTests();
});
