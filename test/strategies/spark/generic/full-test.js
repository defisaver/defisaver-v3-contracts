const { runRepayTests } = require('./repay');
const { runBoostTests } = require('./boost');

describe('Spark Generic Strategy Tests', () => {
    runRepayTests();
    runBoostTests();
});
