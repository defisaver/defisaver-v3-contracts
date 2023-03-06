/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const aaveV3ATokenPayback = await redeploy('AaveV3ATokenPayback', addrs[network].REGISTRY_ADDR, true, true);
    const aaveV3Borrow = await redeploy('AaveV3Borrow', addrs[network].REGISTRY_ADDR, true, true);
    const aaveV3ClaimRewards = await redeploy('AaveV3ClaimRewards', addrs[network].REGISTRY_ADDR, true, true);
    const aaveV3CollateralSwitch = await redeploy('AaveV3CollateralSwitch', addrs[network].REGISTRY_ADDR, true, true);
    const aaveV3Payback = await redeploy('AaveV3Payback', addrs[network].REGISTRY_ADDR, true, true);
    const aaveV3SetEMode = await redeploy('AaveV3SetEMode', addrs[network].REGISTRY_ADDR, true, true);
    const aaveV3Supply = await redeploy('AaveV3Supply', addrs[network].REGISTRY_ADDR, true, true);
    const aaveV3SwapBorrowRateMode = await redeploy('AaveV3SwapBorrowRateMode', addrs[network].REGISTRY_ADDR, true, true);
    const aaveV3Withdraw = await redeploy('AaveV3Withdraw', addrs[network].REGISTRY_ADDR, true, true);
    const aaveV3View = await redeploy('AaveV3View', addrs[network].REGISTRY_ADDR, true, true);
    const aaveFL = await redeploy('FLAaveV3', addrs[network].REGISTRY_ADDR, true, true);

    console.log(`AaveV3ATokenPayback: ${aaveV3ATokenPayback.address}`);
    console.log(`AaveV3Borrow: ${aaveV3Borrow.address}`);
    console.log(`AaveV3ClaimRewards: ${aaveV3ClaimRewards.address}`);
    console.log(`AaveV3CollateralSwitch: ${aaveV3CollateralSwitch.address}`);
    console.log(`AaveV3Payback: ${aaveV3Payback.address}`);
    console.log(`AaveV3SetEMode: ${aaveV3SetEMode.address}`);
    console.log(`AaveV3Supply: ${aaveV3Supply.address}`);
    console.log(`AaveV3SwapBorrowRateMode: ${aaveV3SwapBorrowRateMode.address}`);
    console.log(`AaveV3Withdraw: ${aaveV3Withdraw.address}`);
    console.log(`AaveV3View: ${aaveV3View.address}`);
    console.log(`FLAaveV3: ${aaveFL.address}`);

    process.exit(0);
}

start(main);
