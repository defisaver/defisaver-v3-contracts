const { redeploy } = require('../utils');
const { sparkSwapBorrowRateTest } = require('./spark-tests');

describe('Spark-Borrow-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkBorrow');
        await redeploy('SparkSwapBorrowRateMode');
    });
    it('... should run full aave swap borrow rate test', async () => {
        await sparkSwapBorrowRateTest();
    });
});
