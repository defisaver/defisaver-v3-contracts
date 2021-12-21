const {
    redeploy,
} = require('../utils');
const { reflexerPaybackTest } = require('./reflexer-tests');

describe('Reflexer-Payback', function () {
    before(async () => {
        this.timeout(40000);
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerGenerate');
        await redeploy('ReflexerPayback');
        await redeploy('ReflexerView');
    });

    it('... should do a full Reflexer Payback test', async () => {
        await reflexerPaybackTest();
    }).timeout(50000);
});
