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
    const curveUsdLevCreateTransient = await redeploy('CurveUsdLevCreateTransient', addrs[network].REGISTRY_ADDR, false, true);
    const curveUsdRepayTransient = await redeploy('CurveUsdRepayTransient', addrs[network].REGISTRY_ADDR, false, true);
    const curveUsdSelfLiquidateWithCollTransient = await redeploy('CurveUsdSelfLiquidateWithCollTransient', addrs[network].REGISTRY_ADDR, false, true);
    const curveUsdSwapperTransient = await redeploy('CurveUsdSwapperTransient', addrs[network].REGISTRY_ADDR, false, true);
    const flAction = await redeploy('FLAction', addrs[network].REGISTRY_ADDR, false, true);
    console.log('CurveUsdLevCreateTransient deployed to:', curveUsdLevCreateTransient.address);
    console.log('CurveUsdRepayTransient deployed to:', curveUsdRepayTransient.address);
    console.log('CurveUsdSelfLiquidateWithCollTransient deployed to:', curveUsdSelfLiquidateWithCollTransient.address);
    console.log('CurveUsdSwapperTransient deployed to:', curveUsdSwapperTransient.address);
    console.log('FLAction deployed to:', flAction.address);
    process.exit(0);
}

start(main);
