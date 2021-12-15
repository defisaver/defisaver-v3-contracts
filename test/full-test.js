const {
    redeploy,
    takeSnapshot,
} = require('./utils');
const { aaveFullTest } = require('./aave/aave-tests');

const aaveTestLength = 2;

describe('Run all DeFi Saver tests', async function () {
    this.timeout(10000000);

    let snapshot;

    before(async () => {
        await redeploy('AaveWithdraw');
        await redeploy('AaveBorrow');
        await redeploy('AaveSupply');
        await redeploy('AavePayback');
        await redeploy('AaveClaimStkAave');
        await redeploy('AaveView');
    });
    it('... should run all DeFi Saver tests', async () => {
        snapshot = await takeSnapshot();

        await aaveFullTest(aaveTestLength, snapshot);
    });
});
