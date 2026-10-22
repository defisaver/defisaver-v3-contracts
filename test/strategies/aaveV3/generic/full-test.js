const { runBoostTests } = require('./boost');
const { runRepayTests } = require('./repay');
const { runBoostOnPriceTests } = require('./boost-on-price');
const { runRepayOnPriceTests } = require('./repay-on-price');
const { runFullRepayOnPriceTests } = require('./full-repay-on-price');
const { runCloseTests } = require('./close');
const { runPartialExecutionCloseTests } = require('./partial-execution-close');
const { runTsiOptimizedCloseTests } = require('./tsi-optimized-close');

describe('AaveV3  Full Strategy Tests', () => {
    runBoostTests();
    runRepayTests();
    runBoostOnPriceTests();
    runRepayOnPriceTests();
    runFullRepayOnPriceTests();
    runCloseTests();
    runPartialExecutionCloseTests();
    runTsiOptimizedCloseTests();
});
