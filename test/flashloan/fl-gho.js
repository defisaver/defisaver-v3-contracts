const {
    redeploy,
} = require('../utils');

const { ghoFLTest } = require('./fl-tests');

describe('FL-GHO', function () {
    this.timeout(60000);
    before(async () => {
        await redeploy('FLGho');
        await redeploy('SendToken');
    });

    const tokenSymbol = 'GHO';

    it(`... should get a ${tokenSymbol} flash loan`, async () => {
        await ghoFLTest();
    });
});
