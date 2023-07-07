const { redeploy } = require('../utils');
const { sparkDsrUnwrapTest } = require('./spark-tests');

describe('Spark-Dsr-Unwrap', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkDsrUnwrap');
    });

    it('... should run spark dsr unwrap test', async () => {
        await sparkDsrUnwrapTest();
    });
});
