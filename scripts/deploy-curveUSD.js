/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    // const curveUsdBorrow = await redeploy('CurveUsdBorrow', addrs[network].REGISTRY_ADDR, true, true);
    // const curveUsdCreate = await redeploy('CurveUsdCreate', addrs[network].REGISTRY_ADDR, true, true);
    // const curveUsdPayback = await redeploy('CurveUsdPayback', addrs[network].REGISTRY_ADDR, true, true);
    // const curveUsdSupply = await redeploy('CurveUsdSupply', addrs[network].REGISTRY_ADDR, true, true);
    // const curveUsdWithdraw = await redeploy('CurveUsdWithdraw', addrs[network].REGISTRY_ADDR, true, true);
    const curveUsdSelfLiquidate = await redeploy('CurveUsdSelfLiquidate', addrs[network].REGISTRY_ADDR, true, true);

    // console.log('CurveUsdBorrow deployed to:', curveUsdBorrow.address);
    // console.log('CurveUsdCreate deployed to:', curveUsdCreate.address);
    // console.log('CurveUsdPayback deployed to:', curveUsdPayback.address);
    // console.log('CurveUsdSupply deployed to:', curveUsdSupply.address);
    // console.log('CurveUsdWithdraw deployed to:', curveUsdWithdraw.address);
    console.log('CurveUsdSelfLiquidate deployed to:', curveUsdSelfLiquidate.address);


    process.exit(0);
}

start(main);
