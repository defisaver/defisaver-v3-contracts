/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const chickenBondsView = await redeploy('ChickenBondsView', true);

    const cbChickenIn = await redeploy('CBChickenIn', true);
    const cbChickenOut = await redeploy('CBChickenOut', true);
    const cbCreate = await redeploy('CBCreate', true);
    const cbRedeem = await redeploy('CBRedeem', true);
    const transferNFT = await redeploy('TransferNFT', true);

    console.log(`ChickenBondsView: ${chickenBondsView.address}`);

    console.log(`CBChickenIn: ${cbChickenIn.address}`);
    console.log(`CBChickenOut: ${cbChickenOut.address}`);
    console.log(`CBCreate: ${cbCreate.address}`);
    console.log(`CBRedeem: ${cbRedeem.address}`);
    console.log(`TransferNFT: ${transferNFT.address}`);

    process.exit(0);
}

start(main);
