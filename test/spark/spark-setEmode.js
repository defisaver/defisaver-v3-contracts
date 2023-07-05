const { redeploy } = require('../utils');
const { sparkSetEModeTest } = require('./spark-tests');

describe('Spark-Set-EMode-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkSetEMode');
    });
    it('... should run full aave set EMode test', async () => {
        await sparkSetEModeTest();
    });
});
