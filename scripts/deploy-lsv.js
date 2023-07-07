/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const AaveV3LSVSupply = await redeploy('AaveV3LSVSupply', addrs[network].REGISTRY_ADDR, true, true);
    const AaveV3LSVPayback = await redeploy('AaveV3LSVPayback', addrs[network].REGISTRY_ADDR, true, true);
    const AaveV3LSVBorrow = await redeploy('AaveV3LSVBorrow', addrs[network].REGISTRY_ADDR, true, true);
    const AaveV3LSVWithdraw = await redeploy('AaveV3LSVWithdraw', addrs[network].REGISTRY_ADDR, true, true);
    const MorphoAaveV3LSVSupply = await redeploy('MorphoAaveV3LSVSupply', addrs[network].REGISTRY_ADDR, true, true);
    const MorphoAaveV3LSVPayback = await redeploy('MorphoAaveV3LSVPayback', addrs[network].REGISTRY_ADDR, true, true);
    const MorphoAaveV3LSVBorrow = await redeploy('MorphoAaveV3LSVBorrow', addrs[network].REGISTRY_ADDR, true, true);
    const MorphoAaveV3LSVWithdraw = await redeploy('MorphoAaveV3LSVWithdraw', addrs[network].REGISTRY_ADDR, true, true);
    // const curveView = await redeploy('CurveUsdView', addrs[network].REGISTRY_ADDR, true, true);
    // const curveUsedLevCreate = await redeploy('CurveUsdLevCreate', addrs[network].REGISTRY_ADDR, true, true);
    // const curveUsdRepay = await redeploy('CurveUsdRepay', addrs[network].REGISTRY_ADDR, true, true);

    console.log('AaveV3LSVSupply deployed to:', AaveV3LSVSupply.address);
    console.log('AaveV3LSVPayback deployed to:', AaveV3LSVPayback.address);
    console.log('AaveV3LSVBorrow deployed to:', AaveV3LSVBorrow.address);
    console.log('AaveV3LSVWithdraw deployed to:', AaveV3LSVWithdraw.address);
    console.log('MorphoAaveV3LSVSupply deployed to:', MorphoAaveV3LSVSupply.address);
    console.log('MorphoAaveV3LSVPayback deployed to:', MorphoAaveV3LSVPayback.address);
    console.log('MorphoAaveV3LSVBorrow deployed to:', MorphoAaveV3LSVBorrow.address);
    console.log('MorphoAaveV3LSVWithdraw deployed to:', MorphoAaveV3LSVWithdraw.address);
    // console.log('CurveUsdView deployed to:', curveView.address);
    // console.log('CurveUsdLevCreate deployed to:', curveUsedLevCreate.address);
    // console.log('CurveUsdRepay deployed to:', curveUsdRepay.address);
    // console.log('CurveUsdSelfLiquidateWithColl deployed to:', curveUsdSelfLiquidateWithColl.address);

    process.exit(0);
}

start(main);