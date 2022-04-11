const { liquityEthGainToTroveTest } = require('../liquity-tests');

describe('Liquity-ETH-Gain-To-Trove', () => {
    it('... should test moving stablility pool eth gains to the users trove', async () => {
        await liquityEthGainToTroveTest();
    });
});
