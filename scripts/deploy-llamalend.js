/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const view = await redeploy('LlamaLendView', addrs[network].REGISTRY_ADDR, true, true);
    const create = await redeploy('LlamaLendCreate', addrs[network].REGISTRY_ADDR, true, true);
    const supply = await redeploy('LlamaLendSupply', addrs[network].REGISTRY_ADDR, true, true);
    const withdraw = await redeploy('LlamaLendWithdraw', addrs[network].REGISTRY_ADDR, true, true);
    const borrow = await redeploy('LlamaLendBorrow', addrs[network].REGISTRY_ADDR, true, true);
    const selfLiquidate = await redeploy('LlamaLendSelfLiquidate', addrs[network].REGISTRY_ADDR, true, true);
    const payback = await redeploy('LlamaLendPayback', addrs[network].REGISTRY_ADDR, true, true);

    console.log(`LlamaLendView: ${view.address}`);
    console.log(`LlamaLendCreate: ${create.address}`);
    console.log(`LlamaLendSupply: ${supply.address}`);
    console.log(`LlamaLendWithdraw: ${withdraw.address}`);
    console.log(`LlamaLendBorrow: ${borrow.address}`);
    console.log(`LlamaLendSelfLiquidate: ${selfLiquidate.address}`);
    console.log(`LlamaLendPayback: ${payback.address}`);

    process.exit(0);
}

start(main);
