const { compV3CloseToDebtTest } = require('./compV3-tests');

describe('CompV3 close to debt strategy test', function () {
    this.timeout(80000);

    it('... test CompV3 close to base asset strategy ', async () => {
        await compV3CloseToDebtTest();
    }).timeout(50000);
});
