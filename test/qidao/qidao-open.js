const {
    redeploy,
} = require('../utils');
const { qiDaoOpenTest } = require('./qidao-tests');

describe('QiDao-Open', () => {
    before(async () => {
        await redeploy('QiDaoOpen');
    });

    it('... should test QiDaoOpen contract', async () => {
        await qiDaoOpenTest();
    });
});
