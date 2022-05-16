const { qiDaoFullTest } = require('./qidao-tests');

describe('QiDao full test', () => {
    it('... should do full QiDao test', async () => {
        await qiDaoFullTest();
    });
});
