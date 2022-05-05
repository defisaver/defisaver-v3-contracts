const {
    redeploy,
} = require('../utils');
const { qiDaoGenerateTest } = require('./qidao-tests');

describe('QiDao-Generate', () => {
    before(async () => {
        await redeploy('QiDaoOpen');
        await redeploy('QiDaoSupply');
        await redeploy('QiDaoGenerate');
    });

    it('... should test QiDaoGenerate contract', async () => {
        await qiDaoGenerateTest();
    });
});
