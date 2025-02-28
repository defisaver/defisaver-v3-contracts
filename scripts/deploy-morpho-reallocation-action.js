/* eslint-disable import/no-extraneous-dependencies */
const hre = require('hardhat');
const { configure } = require('@defisaver/sdk');
const { start } = require('./utils/starter');
const {
    redeploy,
    network,
    getOwnerAddr,
    chainIds,
} = require('../test/utils');
const { topUp } = require('./utils/fork');

async function main() {
    if (chainIds[network] === 8453) {
        configure({ chainId: 8453, testMode: true });
    }
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());
    await redeploy('MorphoBlueReallocateLiquidity', true);
}
start(main);
