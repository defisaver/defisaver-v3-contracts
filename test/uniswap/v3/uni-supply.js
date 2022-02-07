const {
    redeploy,
} = require('../../utils');

const { uniV3SupplyTest } = require('./univ3-tests');

describe('Uni-Supply-V3', () => {
    before(async () => {
        await redeploy('UniMintV3');
        await redeploy('UniSupplyV3');
    });

    it('... should Log event', async () => {
        await uniV3SupplyTest();
    }).timeout(50000);
});
