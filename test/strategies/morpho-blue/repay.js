const { resetForkToBlock } = require('../../utils');
const { morphoBlueRepayStrategyTest } = require('./morphoblue-tests');

describe('MorphoBlue Repay Strategy test', function () {
    this.timeout(80000);

    it('... test MorphoBlue repay strategy', async () => {
        await resetForkToBlock();
        await morphoBlueRepayStrategyTest(false);
        await resetForkToBlock();
        await morphoBlueRepayStrategyTest(true);
    }).timeout(50000);
});
