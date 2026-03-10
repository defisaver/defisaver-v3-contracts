const { redeploy } = require('../../utils/utils');
const { sparkClaimSPKTest } = require('./spark-tests');

describe('Spark-SPK-Claim', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('SparkSPKClaim');
    });
    it('... should run full spark SPK claim test', async () => {
        await sparkClaimSPKTest();
    });
});
