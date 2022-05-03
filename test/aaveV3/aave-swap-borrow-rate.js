const { redeploy } = require('../utils');
const { aaveV3SwapBorrowRateTest } = require('./aave-tests');

describe('Aave-Borrow-L2', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3Borrow');
        await redeploy('AaveV3SwapBorrowRateMode');
    });
    it('... should run full aave swap borrow rate test', async () => {
        await aaveV3SwapBorrowRateTest();
    });
});
