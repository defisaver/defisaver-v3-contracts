const { redeploy } = require('../utils');
const { botRefillTest } = require('./utils-tests');

describe('Bot-Refills', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('BotRefills');
    });

    it('... should call refill with WETH', async () => {
        await botRefillTest();
    });
});
