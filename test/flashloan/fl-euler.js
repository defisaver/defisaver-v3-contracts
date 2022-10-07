const {
    redeploy,
} = require('../utils');

const { eulerFLTest } = require('./fl-tests');

describe('FL-Euler', function () {
    this.timeout(60000);
    before(async () => {
        await redeploy('FLEuler');
        await redeploy('SendToken');
    });

    it('... should get a Euler flash loan', async () => {
        await eulerFLTest();
    });
});
