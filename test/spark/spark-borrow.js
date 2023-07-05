const { redeploy } = require('../utils');
const { sparkBorrowTest } = require('./spark-tests');

describe('Spark-Borrow-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkBorrow');
    });

    it('... should run full aave borrow test', async () => {
        await sparkBorrowTest();
    });
});
