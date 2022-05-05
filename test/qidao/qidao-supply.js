const {
    redeploy,
} = require('../utils');
const { qiDaoSupplyTest } = require('./qidao-tests');

describe('QiDao-Supply', () => {
    before(async () => {
        await redeploy('QiDaoOpen');
        await redeploy('QiDaoSupply');
    });

    it('... should test QiDaoSupply contract', async () => {
        await qiDaoSupplyTest();
    });
});
