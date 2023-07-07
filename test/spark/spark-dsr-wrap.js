const { redeploy } = require('../utils');
const { sparkDsrWrapTest } = require('./spark-tests');

describe('Spark-Dsr-Wrap', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkDsrWrap');
    });

    it('... should run spark dsr wrap test', async () => {
        await sparkDsrWrapTest();
    });
});
