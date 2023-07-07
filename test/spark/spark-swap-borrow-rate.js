const { redeploy } = require('../utils');
const { sparkSwapBorrowRateTest } = require('./spark-tests');

describe('Spark-Borrow', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkBorrow');
        await redeploy('SparkSwapBorrowRateMode');
    });
    it('... should run full spark swap borrow rate test', async () => {
        await sparkSwapBorrowRateTest();
    });
});
