const { redeploy } = require('../utils');
const { sparkPaybackTest } = require('./spark-tests');

describe('Spark-Payback', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkBorrow');
        await redeploy('SparkPayback');
    });
    it('... should run full spark payback test', async () => {
        await sparkPaybackTest();
    });
});
