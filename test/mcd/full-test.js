const { ilks } = require('@defisaver/tokens');
const { resetForkToBlock } = require('../utils');
const { mcdFullTest } = require('./mcd-tests');

const config = require('../../hardhat.config.js');

describe('Maker full test', () => {
    it('... should do full Maker test', async () => {
        await resetForkToBlock(14368070);
        let testLength = ilks.length;
        if (config.lightTesting) testLength = 2;
        await mcdFullTest(testLength);
    });
});
