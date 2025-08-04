const { runBoostTests } = require('./boost');
const { runRepayTests } = require('./repay');

describe('CompV3 Full Strategy Tests', () => {
    runBoostTests();
    runRepayTests();
});
