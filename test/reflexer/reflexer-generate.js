const {
    redeploy,
} = require('../utils');
const { reflexerGenerateTest } = require('./reflexer-tests');

describe('Reflexer-Generate', () => {
    before(async () => {
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerGenerate');
    });

    it('... should do a full Reflexer Generate', async () => {
        await reflexerGenerateTest();
    }).timeout(40000);
});
