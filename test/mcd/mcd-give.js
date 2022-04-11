const {
    redeploy,
} = require('../utils');

const { mcdGiveTest } = require('./mcd-tests');

describe('Mcd-Give', () => {
    before(async () => {
        await redeploy('McdOpen');
        await redeploy('McdGive');
    });

    it('... should give a cdp to another proxy', async () => {
        await mcdGiveTest();
    });
});
