const { curveFullTest } = require('./curve-tests');
const config = require('../../hardhat.config.js');

describe('Curve full test', () => {
    it('... should do full curve test', async () => {
        let testLength = -1;
        if (config.lightTesting) testLength = 2;
        await curveFullTest(testLength);
    });
});
