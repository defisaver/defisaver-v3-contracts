const {
    redeploy,
} = require('../utils');

const { reflexerOpenTest } = require('./reflexer-tests');

describe('Reflexer-Open', () => {
    before(async () => {
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerView');
    });

    it('... should run full Reflexer Open test', async () => {
        await reflexerOpenTest();
    }).timeout(500000);
});
