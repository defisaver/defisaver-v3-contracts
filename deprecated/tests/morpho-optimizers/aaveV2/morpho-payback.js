const { morphoAaveV2PaybackTest } = require('./morpho-tests');
const config = require('../../../../hardhat.config');

let testLength = 10;
if (config.lightTesting) testLength = 2;
morphoAaveV2PaybackTest(testLength);
