const { convexClaimTest } = require('./convex-tests');
const config = require('../../hardhat.config.js');

(() => {
    let testLength;
    if (config.lightTesting) testLength = 2;
    convexClaimTest(testLength);
})();
