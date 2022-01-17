const {
    redeploy,
} = require('../../utils');
const { uniSupplyTest } = require('./uni-tests');

describe('Uni-Supply', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('UniSupply');
    });

    it('... should supply  to uniswap', async () => {
        await uniSupplyTest();
    });
});
