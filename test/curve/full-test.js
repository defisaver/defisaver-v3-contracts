const { curveFullTest } = require('./curve-tests');
const config = require('../../hardhat.config');

describe('Curve full test', () => {
    it('... should do full curve test', async () => {
        let testLength;
        if (config.lightTesting) testLength = 2;
        // TODO: commented out for now
        await curveFullTest(testLength);
    });
});
