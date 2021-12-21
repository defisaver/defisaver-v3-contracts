const {
    redeploy,
} = require('../utils');
const { reflexerSaviourTest } = require('./reflexer-tests');

describe('Reflexer-Saviour', () => {
    before(async () => {
        await redeploy('ReflexerOpen');
        await redeploy('ReflexerSupply');
        await redeploy('ReflexerWithdraw');
        await redeploy('ReflexerGenerate');
        await redeploy('ReflexerView');
        await redeploy('ReflexerNativeUniV2SaviourDeposit');
        await redeploy('ReflexerNativeUniV2SaviourWithdraw');
    });

    it('... deposit LP tokens to reflexer saviour and then withdraw them', async () => {
        await reflexerSaviourTest();
    }).timeout(1000000);
});
