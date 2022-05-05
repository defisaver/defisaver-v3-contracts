const {
    redeploy,
} = require('../utils');
const { qiDaoPaybackTest } = require('./qidao-tests');

describe('QiDao-Payback', () => {
    before(async () => {
        await redeploy('QiDaoOpen');
        await redeploy('QiDaoSupply');
        await redeploy('QiDaoGenerate');
        await redeploy('QiDaoPayback');
    });

    it('... should test QiDaoPayback contract', async () => {
        await qiDaoPaybackTest();
    });
});
