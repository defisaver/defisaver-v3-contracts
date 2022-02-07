const {
    redeploy,
} = require('../utils');
const { yearnSupplyTest } = require('./yearn-tests');

describe('Yearn-Supply', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('YearnSupply');
    });

    it('... should supply  to Yearn', async () => {
        await yearnSupplyTest(0);
    }).timeout(50000);
});
