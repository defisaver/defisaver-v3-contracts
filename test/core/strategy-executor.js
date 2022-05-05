const { resetForkToBlock } = require('../utils');
const { strategyExecutorTest } = require('./core-tests');

describe('Strategy-Executor', () => {
    it('... should test strategyExecutor', async () => {
        await resetForkToBlock();

        await strategyExecutorTest();
    }).timeout(50000);
});
