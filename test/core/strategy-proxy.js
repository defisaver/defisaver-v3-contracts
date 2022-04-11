const { strategyProxyTest } = require('./core-tests');
const { resetForkToBlock } = require('../utils');

describe('Strategy-Proxy', () => {
    it('... should test strategyProxy', async () => {
        await resetForkToBlock();

        await strategyProxyTest();
    }).timeout(50000);
});
