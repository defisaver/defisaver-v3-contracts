const { ilks } = require('@defisaver/tokens');
const {
    redeploy,
} = require('../utils');
const { mcdOpenTest } = require('./mcd-tests');

describe('Mcd-Open', () => {
    before(async () => {
        await redeploy('McdOpen');
    });

    it('... should test Maker Open', async () => {
        await mcdOpenTest(1);
    });
});
