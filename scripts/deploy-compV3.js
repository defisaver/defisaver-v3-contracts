/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const compV3View = await redeploy('CompV3View', addrs[network].REGISTRY_ADDR, true, true);

    const compV3Allow = await redeploy('CompV3Allow', addrs[network].REGISTRY_ADDR, true, true);
    const compV3Borrow = await redeploy('CompV3Borrow', addrs[network].REGISTRY_ADDR, true, true);
    const compV3Claim = await redeploy('CompV3Claim', addrs[network].REGISTRY_ADDR, true, true);
    const compV3Payback = await redeploy('CompV3Payback', addrs[network].REGISTRY_ADDR, true, true);
    const compV3Supply = await redeploy('CompV3Supply', addrs[network].REGISTRY_ADDR, true, true);
    const compV3Transfer = await redeploy('CompV3Transfer', addrs[network].REGISTRY_ADDR, true, true);
    const compV3Withdraw = await redeploy('CompV3Withdraw', addrs[network].REGISTRY_ADDR, true, true);

    console.log(`CompV3View: ${compV3View.address}`);

    console.log(`CompV3Allow: ${compV3Allow.address}`);
    console.log(`CompV3Borrow: ${compV3Borrow.address}`);
    console.log(`CompV3Claim: ${compV3Claim.address}`);
    console.log(`CompV3Payback: ${compV3Payback.address}`);
    console.log(`CompV3Supply: ${compV3Supply.address}`);
    console.log(`CompV3Transfer: ${compV3Transfer.address}`);
    console.log(`CompV3Withdraw: ${compV3Withdraw.address}`);

    process.exit(0);
}

start(main);
