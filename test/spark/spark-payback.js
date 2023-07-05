const { redeploy } = require('../utils');
const { sparkPaybackTest } = require('./spark-tests');

describe('Spark-Payback-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkBorrow');
        await redeploy('SparkPayback');
    });
    it('... should run full aave payback test', async () => {
        await sparkPaybackTest();
    });
});
