/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const curveUsdBorrow = await redeploy('AaveV3LSVProfitTracker', addrs[network].REGISTRY_ADDR, true, true);
    const curveUsdCreate = await redeploy('ChangeLSVProxyOwner', addrs[network].REGISTRY_ADDR, true, true);
    const curveUsdPayback = await redeploy('AaveV3LSVSupply', addrs[network].REGISTRY_ADDR, true, true);
    const curveUsdSupply = await redeploy('AaveV3LSVPayback', addrs[network].REGISTRY_ADDR, true, true);
    const curveUsdWithdraw = await redeploy('AaveV3LSVBorrow', addrs[network].REGISTRY_ADDR, true, true);
    const curveUsdSelfLiquidate = await redeploy('AaveV3LSVWithdraw', addrs[network].REGISTRY_ADDR, true, true);
    // const curveView = await redeploy('CurveUsdView', addrs[network].REGISTRY_ADDR, true, true);
    // const curveUsedLevCreate = await redeploy('CurveUsdLevCreate', addrs[network].REGISTRY_ADDR, true, true);
    // const curveUsdRepay = await redeploy('CurveUsdRepay', addrs[network].REGISTRY_ADDR, true, true);

    console.log('AaveV3LSVProfitTracker deployed to:', curveUsdBorrow.address);
    console.log('ChangeLSVProxyOwner deployed to:', curveUsdCreate.address);
    console.log('AaveV3LSVSupply deployed to:', curveUsdPayback.address);
    console.log('AaveV3LSVPayback deployed to:', curveUsdSupply.address);
    console.log('AaveV3LSVBorrow deployed to:', curveUsdWithdraw.address);
    console.log('AaveV3LSVWithdraw deployed to:', curveUsdSelfLiquidate.address);
    // console.log('CurveUsdView deployed to:', curveView.address);
    // console.log('CurveUsdLevCreate deployed to:', curveUsedLevCreate.address);
    // console.log('CurveUsdRepay deployed to:', curveUsdRepay.address);
    // console.log('CurveUsdSelfLiquidateWithColl deployed to:', curveUsdSelfLiquidateWithColl.address);

    process.exit(0);
}

start(main);