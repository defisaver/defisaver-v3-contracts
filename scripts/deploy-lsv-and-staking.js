/* eslint-disable import/no-extraneous-dependencies */
const hre = require('hardhat');
const { start } = require('./utils/starter');
const {
    redeploy, addrs, network, getOwnerAddr,
} = require('../test/utils');
const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());

    const lsvSell = await redeploy('LSVSell', true);
    const etherFiStake = await redeploy('EtherFiStake', true);
    const etherFiWrap = await redeploy('EtherFiWrap', true);
    const etherFiUnwrap = await redeploy('EtherFiUnwrap', true);
    const renzoStake = await redeploy('RenzoStake', true);
    const lsvView = await redeploy('LSVView', true);
    console.log(`LSVSell: ${lsvSell.address}`);
    console.log(`EtherFiStake: ${etherFiStake.address}`);
    console.log(`EtherFiWrap: ${etherFiWrap.address}`);
    console.log(`EtherFiUnwrap: ${etherFiUnwrap.address}`);
    console.log(`RenzoStake: ${renzoStake.address}`);
    console.log(`LSVView: ${lsvView.address}`);

    process.exit(0);
}

start(main);
