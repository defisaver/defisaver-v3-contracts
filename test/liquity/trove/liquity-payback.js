const { liqiutyPaybackTest } = require('../liquity-tests');

describe('Liquity-Payback', () => {
    it('... should test paying back lusd to a liquity trove', async () => {
        await liqiutyPaybackTest();
    });
});
