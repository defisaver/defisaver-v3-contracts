const {
    aaveV2assetsDefaultMarket,
} = require('../utils-aave');

const {
    redeploy,
} = require('../utils');

const { aaveBorrowTest } = require('./aave-tests');

describe('Aave-Borrow', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('AaveSupply');
        await redeploy('AaveBorrow');
        await redeploy('AaveSupply');
    });
    it('... should run aave Borrow test', async () => {
        await aaveBorrowTest(aaveV2assetsDefaultMarket.length);
    });
});
