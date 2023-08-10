/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    // STEP 0 : set FORK_ID in .env
    // STEP 1 : npx hardhat compile

    // STEP 2 : Deploy LSVProxyRegistry & LSVProfitTracker (node scripts/deploy-lsv --network fork)
    const proxyRegistry = await redeploy('LSVProxyRegistry', addrs[network].REGISTRY_ADDR, true, true);
    const profitTracker = await redeploy('LSVProfitTracker', addrs[network].REGISTRY_ADDR, true, true);

    console.log('LSVProxyRegistry deployed to:', proxyRegistry.address);
    console.log('LSVProfitTracker deployed to:', profitTracker.address);

    // STEP 3 : Update LSV_PROXY_REGISTRY_ADDRESS in MainnetActionsUtilAddresses
    // STEP 4 : Update LSV_PROFIT_TRACKER_ADDRESS in LSVUtilMainnetAddresses
    // STEP 5 : npx hardhat compile

    // STEP 6 : Uncomment bottom part, comment out above part

    /*
    // STEP 7 : Deploy all other actions (node scripts/deploy-lsv --network fork)
    const test1 = await redeploy('LSVSupply', addrs[network].REGISTRY_ADDR, true, true);
    const test2 = await redeploy('LSVBorrow', addrs[network].REGISTRY_ADDR, true, true);
    const test3 = await redeploy('LSVPayback', addrs[network].REGISTRY_ADDR, true, true);
    const test4 = await redeploy('LSVWithdraw', addrs[network].REGISTRY_ADDR, true, true);
    const test5 = await redeploy('LSVSell', addrs[network].REGISTRY_ADDR, true, true);
    const test6 = await redeploy('ApproveToken', addrs[network].REGISTRY_ADDR, true, true);
    const test7 = await redeploy('MorphoAaveV3SetManager', addrs[network].REGISTRY_ADDR, true, true);
    const test8 = await redeploy('LSVView', addrs[network].REGISTRY_ADDR, true, true);

    console.log('LSVSupply deployed to:', test1.address);
    console.log('LSVBorrow deployed to:', test2.address);
    console.log('LSVPayback deployed to:', test3.address);
    console.log('LSVWithdraw deployed to:', test4.address);
    console.log('LSVSell deployed to:', test5.address);
    console.log('ApproveToken deployed to:', test6.address);
    console.log('MorphoAaveV3SetManager deployed to:', test7.address);
    console.log('LSVView deployed to:', test8.address);
    */
    process.exit(0);
}

start(main);
