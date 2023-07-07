const { redeploy } = require('../utils');
const { sparkATokenPaybackTest } = require('./spark-tests');

describe('Spark-ATokenPayback', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkBorrow');
        await redeploy('SparkATokenPayback');
    });
    it('... should run full spark atoken payback test', async () => {
        await sparkATokenPaybackTest();
    });
});
