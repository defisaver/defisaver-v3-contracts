const { redeploy } = require('../utils');
const { sparkSupplyTest } = require('./spark-tests');

describe('Spark-Supply-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
    });

    it('... should run full aave supply test', async () => {
        await sparkSupplyTest();
    });
});
