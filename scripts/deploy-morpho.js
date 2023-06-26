/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

// const MORPHO_GENERAL_ADDR = '0xf5Ce81CA40f20e39cB9Da12B8c186291Ec471f4f';
// const MORPHO_ETH_ADDR = '0x2971794D87dd68ab30c315D1e9A378a1C8134244';

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    // const morphoMarketStorage = await redeploy(
    //     'MorphoMarketStorage',
    //     addrs[network].REGISTRY_ADDR,
    //     true,
    //     true,
    //     MORPHO_GENERAL_ADDR,
    //     MORPHO_ETH_ADDR,
    // );
    // console.log(`MorphoMarketStorage: ${morphoMarketStorage.address}`);

    const morphoAaveV3Supply = await redeploy('MorphoAaveV3Supply', addrs[network].REGISTRY_ADDR, true, true);
    const morphoAaveV3Borrow = await redeploy('MorphoAaveV3Borrow', addrs[network].REGISTRY_ADDR, true, true);
    const morphoAaveV3Withdraw = await redeploy('MorphoAaveV3Withdraw', addrs[network].REGISTRY_ADDR, true, true);
    const morphoAaveV3Payback = await redeploy('MorphoAaveV3Payback', addrs[network].REGISTRY_ADDR, true, true);

    console.log(`MorphoAaveV3Supply: ${morphoAaveV3Supply.address}`);
    console.log(`MorphoAaveV3Borrow: ${morphoAaveV3Borrow.address}`);
    console.log(`MorphoAaveV3Withdraw: ${morphoAaveV3Withdraw.address}`);
    console.log(`MorphoAaveV3Payback: ${morphoAaveV3Payback.address}`);

    process.exit(0);
}

start(main);
