const { runEOABoostTests } = require('./boost');
const { runEOARepayTests } = require('./repay');
const { runEOABoostOnPriceTests } = require('./boost-on-price');
const { runEOARepayOnPriceTests } = require('./repay-on-price');
const { runEOACloseTests } = require('./close');

describe('AaveV3 EOA Full Strategy Tests', () => {
    runEOABoostTests();
    runEOARepayTests();
    runEOABoostOnPriceTests();
    runEOARepayOnPriceTests();
    runEOACloseTests();
});
