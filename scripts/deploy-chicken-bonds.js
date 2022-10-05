/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const chickenBondsView = await redeploy('ChickenBondsView', addrs[network].REGISTRY_ADDR, true, true);

    const cbChickenIn = await redeploy('CBChickenIn', addrs[network].REGISTRY_ADDR, true, true);
    const cbChickenOut = await redeploy('CBChickenOut', addrs[network].REGISTRY_ADDR, true, true);
    const cbCreate = await redeploy('CBCreate', addrs[network].REGISTRY_ADDR, true, true);
    const cbRedeem = await redeploy('CBRedeem', addrs[network].REGISTRY_ADDR, true, true);
    const sendNFT = await redeploy('SendNFT', addrs[network].REGISTRY_ADDR, true, true);

    console.log(`ChickenBondsView: ${chickenBondsView.address}`);

    console.log(`CBChickenIn: ${cbChickenIn.address}`);
    console.log(`CBChickenOut: ${cbChickenOut.address}`);
    console.log(`CBCreate: ${cbCreate.address}`);
    console.log(`CBRedeem: ${cbRedeem.address}`);
    console.log(`SendNFT: ${sendNFT.address}`);

    process.exit(0);
}

start(main);
