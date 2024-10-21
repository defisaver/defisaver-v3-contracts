/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');
const {
    redeploy, addrs, network, getOwnerAddr,
} = require('../test/utils');
const { topUp } = require('./utils/fork');

const ONLY_BASIC = true;

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());

    const eulerV2Supply = await redeploy('EulerV2Supply', addrs[network].REGISTRY_ADDR, false, true);
    const eulerV2Withdraw = await redeploy('EulerV2Withdraw', addrs[network].REGISTRY_ADDR, false, true);
    const eulerV2Borrow = await redeploy('EulerV2Borrow', addrs[network].REGISTRY_ADDR, false, true);
    const eulerV2Payback = await redeploy('EulerV2Payback', addrs[network].REGISTRY_ADDR, false, true);
    const eulerV2View = await redeploy('EulerV2View', addrs[network].REGISTRY_ADDR, false, true);

    console.log(`EulerV2Supply: ${eulerV2Supply.address}`);
    console.log(`EulerV2Withdraw: ${eulerV2Withdraw.address}`);
    console.log(`EulerV2Borrow: ${eulerV2Borrow.address}`);
    console.log(`EulerV2Payback: ${eulerV2Payback.address}`);
    console.log(`EulerV2View: ${eulerV2View.address}`);

    if (!ONLY_BASIC) {
        const eulerV2PaybackWithShares = await redeploy('EulerV2PaybackWithShares', addrs[network].REGISTRY_ADDR, false, true);
        const eulerV2PullDebt = await redeploy('EulerV2PullDebt', addrs[network].REGISTRY_ADDR, false, true);
        const eulerV2CollateralSwitch = await redeploy('EulerV2CollateralSwitch', addrs[network].REGISTRY_ADDR, false, true);
        const eulerV2ReorderCollaterals = await redeploy('EulerV2ReorderCollaterals', addrs[network].REGISTRY_ADDR, false, true);

        console.log(`EulerV2PaybackWithShares: ${eulerV2PaybackWithShares.address}`);
        console.log(`EulerV2PullDebt: ${eulerV2PullDebt.address}`);
        console.log(`EulerV2CollateralSwitch: ${eulerV2CollateralSwitch.address}`);
        console.log(`EulerV2ReorderCollaterals: ${eulerV2ReorderCollaterals.address}`);
    }
    process.exit(0);
}

start(main);
