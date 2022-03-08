const { yearnFullTest } = require('./yearn-tests');

const config = require('../../hardhat.config.js');

describe('Utils full test', () => {
    it('... should do full Utils test', async () => {
        let testLength = 0;
        if (config.lightTesting) testLength = 2;
        await yearnFullTest(testLength);
    });
});
