/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const test1 = await redeploy('LSVSupply', addrs[network].REGISTRY_ADDR, true, true);
    const test2 = await redeploy('LSVBorrow', addrs[network].REGISTRY_ADDR, true, true);
    const test3 = await redeploy('LSVPayback', addrs[network].REGISTRY_ADDR, true, true);
    const test4 = await redeploy('LSVWithdraw', addrs[network].REGISTRY_ADDR, true, true);
    const test5 = await redeploy('ChangeLSVProxyOwner', addrs[network].REGISTRY_ADDR, true, true);

    console.log('LSVSupply deployed to:', test1.address);
    console.log('LSVBorrow deployed to:', test2.address);
    console.log('LSVPayback deployed to:', test3.address);
    console.log('LSVWithdraw deployed to:', test4.address);
    console.log('ChangeLSVProxyOwner deployed to:', test5.address);

    process.exit(0);
}

start(main);
