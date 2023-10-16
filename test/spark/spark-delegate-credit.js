const { redeploy } = require('../utils');
const { sparkDelegateCreditTest } = require('./spark-tests');

describe('Spark-Delegate-Credit', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkDelegateCredit');
    });
    it('... should run full spark delegate credit test', async () => {
        await sparkDelegateCreditTest();
    });
});
