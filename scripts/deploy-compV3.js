/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network, getOwnerAddr } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());

    const compV3RatioCheck = await redeploy('StarknetClaim', addrs[network].REGISTRY_ADDR, true, true);
    process.exit(0);
}

start(main);
