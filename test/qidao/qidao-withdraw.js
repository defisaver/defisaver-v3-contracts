const {
    redeploy,
} = require('../utils');
const { qiDaoWithdrawTest } = require('./qidao-tests');

describe('QiDao-Withdraw', () => {
    before(async () => {
        await redeploy('QiDaoOpen');
        await redeploy('QiDaoSupply');
        await redeploy('QiDaoWithdraw');
    });

    it('... should test QiDaoWithdraw contract', async () => {
        await qiDaoWithdrawTest();
    });
});
