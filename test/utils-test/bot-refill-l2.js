const { redeploy } = require('../utils');
const { botRefillL2Test } = require('./utils-tests');

describe('Bot-Refills', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('BotRefillsL2');
    });

    it('... should call refill with WETH', async () => {
        await botRefillL2Test();
    });
});
