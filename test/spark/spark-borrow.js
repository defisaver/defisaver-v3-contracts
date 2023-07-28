const { redeploy } = require('../utils');
const { sparkBorrowTest } = require('./spark-tests');

describe('Spark-Borrow', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkBorrow');
    });

    it('... should run full spark borrow test', async () => {
        await sparkBorrowTest();
    });
});
