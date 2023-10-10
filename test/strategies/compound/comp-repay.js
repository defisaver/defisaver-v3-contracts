const { compV2RepayTest } = require('./compound-tests');

describe('Comp Repay Strategy test', function () {
    this.timeout(80000);

    it('... test comp repay strategy', async () => {
        await compV2RepayTest();
    }).timeout(50000);
});
