const {
    redeploy,
} = require('../utils');

const { makerFLTest } = require('./fl-tests');

describe('FL-Maker', function () {
    this.timeout(60000);
    before(async () => {
        await redeploy('FLMaker');
        await redeploy('SendToken');
        await redeploy('RecipeExecutor');
    });

    const tokenSymbol = 'DAI';

    it(`... should get a ${tokenSymbol} Maker flash loan`, async () => {
        await makerFLTest();
    });
});
