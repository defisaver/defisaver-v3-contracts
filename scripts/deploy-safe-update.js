/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const { redeploy, addrs, network } = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    console.log("heooooo");

    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const recipeExecutor = await redeploy('RecipeExecutor', addrs[network].REGISTRY_ADDR, true, true);
    const dfsSell = await redeploy('DFSSell', addrs[network].REGISTRY_ADDR, true, true);
    const flBalancer = await redeploy('FLBalancer', addrs[network].REGISTRY_ADDR, true, true);

    console.log('RecipeExecutor deployed to:', recipeExecutor.address);
    console.log('DFSSell deployed to:', dfsSell.address);
    console.log('flBalancer deployed to:', flBalancer.address);

    process.exit(0);
}

main();
