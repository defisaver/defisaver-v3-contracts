const { redeploy } = require('../utils');
const { sDaiWrapTest } = require('./spark-tests');

describe('sDai-Wrap', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SDaiWrap');
    });

    it('... should run spark dsr wrap test', async () => {
        await sDaiWrapTest();
    });
});
