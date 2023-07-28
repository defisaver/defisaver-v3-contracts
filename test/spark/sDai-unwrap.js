const { redeploy } = require('../utils');
const { sDaiUnwrapTest } = require('./spark-tests');

describe('sDai-Unwrap', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SDaiUnwrap');
    });

    it('... should run spark dsr unwrap test', async () => {
        await sDaiUnwrapTest();
    });
});
