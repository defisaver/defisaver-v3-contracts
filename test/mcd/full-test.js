const { ilks } = require('@defisaver/tokens');
const { mcdFullTest } = require('./mcd-tests');

const config = require('../../hardhat.config');

describe('Maker full test', () => {
    it('... should do full Maker test', async () => {
        let testLength = ilks.length;
        if (config.lightTesting) testLength = 2;
        await mcdFullTest(testLength);
    });
});
