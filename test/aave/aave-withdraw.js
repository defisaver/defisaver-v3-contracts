const {
    aaveV2assetsDefaultMarket,
} = require('../utils-aave');

const {
    redeploy,
} = require('../utils');

const { aaveWithdrawTest } = require('./aave-tests');

describe('Aave-Withdraw', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveWithdraw');
        await redeploy('AaveBorrow');
        await redeploy('AaveSupply');
    });
    it('... should run full aave withdraw test', async () => {
        await aaveWithdrawTest(aaveV2assetsDefaultMarket.length);
    });
});
