const { redeploy } = require('../utils');
const { sparkCollSwitchTest } = require('./spark-tests');

describe('Spark-Coll-Switch-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSupply');
        await redeploy('SparkCollateralSwitch');
    });

    it('... should run full aave coll switch test', async () => {
        await sparkCollSwitchTest();
    });
});
