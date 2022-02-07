const {
    redeploy,
} = require('../../utils');
const { uniWithdrawTest } = require('./uni-tests');

describe('Uni-Withdraw', function () {
    this.timeout(80000);

    before(async () => {
        await redeploy('UniSupply');
        await redeploy('UniWithdraw');
    });

    it('... should withdraw from uniswap', async () => {
        await uniWithdrawTest();
    });
});
