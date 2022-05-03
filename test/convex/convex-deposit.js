const { convexDepositTest } = require('./convex-tests');
const config = require('../../hardhat.config');

(() => {
    let testLength;
    if (config.lightTesting) testLength = 2;
    convexDepositTest(testLength);
})();
