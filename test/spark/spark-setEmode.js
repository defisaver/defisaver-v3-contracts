const { redeploy } = require('../utils');
const { sparkSetEModeTest } = require('./spark-tests');

describe('Spark-Set-EMode', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkSetEMode');
    });
    it('... should run full spark set EMode test', async () => {
        await sparkSetEModeTest();
    });
});
