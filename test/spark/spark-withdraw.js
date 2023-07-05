const { redeploy } = require('../utils');
const { sparkWithdrawTest } = require('./spark-tests');

describe('Spark-Withdraw-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkWithdraw');
    });
    it('... should run full aave withdraw test', async () => {
        await sparkWithdrawTest();
    });
});
