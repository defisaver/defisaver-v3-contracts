const { redeploy } = require('../utils');
const { sparkWithdrawTest } = require('./spark-tests');

describe('Spark-Withdraw', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkWithdraw');
    });
    it('... should run full spark withdraw test', async () => {
        await sparkWithdrawTest();
    });
});
