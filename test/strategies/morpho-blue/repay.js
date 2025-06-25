const { resetForkToBlock } = require('../../utils/utils');
const { morphoBlueRepayStrategyTest } = require('./morphoblue-tests');

describe('MorphoBlue Repay Strategy test', function () {
    this.timeout(80000);

    it('... test MorphoBlue repay strategy', async () => {
        await resetForkToBlock();
        await morphoBlueRepayStrategyTest(false);
    }).timeout(50000);
});
