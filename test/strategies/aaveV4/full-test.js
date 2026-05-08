const { runBoostTests } = require('./boost');
const { runBoostOnPriceTests } = require('./boost-on-price');
const { runRepayTests } = require('./repay');
const { runRepayOnPriceTests } = require('./repay-on-price');
const { runCloseTests } = require('./close');
const { runCollateralSwitchTests } = require('./collateral-switch');

describe('AaveV4 Full Strategy Tests', () => {
    runBoostTests();
    runRepayTests();
    runBoostOnPriceTests();
    runRepayOnPriceTests();
    runCloseTests();
    runCollateralSwitchTests();
});
