const { redeploy } = require('../utils');
const { sparkSpTokenPaybackTest } = require('./spark-tests');

describe('Spark-SpTokenPayback', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkBorrow');
        await redeploy('SparkSpTokenPayback');
    });
    it('... should run full spark atoken payback test', async () => {
        await sparkSpTokenPaybackTest();
    });
});
