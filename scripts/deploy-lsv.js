/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    // const test = await redeploy('Test', addrs[network].REGISTRY_ADDR, true, true);

    // console.log('Test deployed to:', test.address);

    process.exit(0);
}

start(main);
