const { redeploy } = require('../utils');
const { sparkSupplyTest } = require('./spark-tests');

describe('Spark-Supply', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
    });

    it('... should run full spark supply test', async () => {
        await sparkSupplyTest();
    });
});
