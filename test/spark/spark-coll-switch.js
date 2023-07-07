const { redeploy } = require('../utils');
const { sparkCollSwitchTest } = require('./spark-tests');

describe('Spark-Coll-Switch', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkCollateralSwitch');
    });

    it('... should run full spark coll switch test', async () => {
        await sparkCollSwitchTest();
    });
});
