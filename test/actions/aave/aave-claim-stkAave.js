const {
    redeploy,
} = require('../../utils/utils');
const { aaveClaimStkAaveTest } = require('./aave-tests');

describe('Aave-claim staked aave test', function () {
    this.timeout(150000);

    before(async () => {
        await redeploy('AaveSupply');
        await redeploy('AaveClaimStkAave');
        await redeploy('AaveView');
    });
    it('... should run full aave claim staked aave test', async () => {
        await aaveClaimStkAaveTest();
    });
});
