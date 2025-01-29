/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const {
    redeploy, addrs, network, getOwnerAddr,
} = require('../test/utils');

const { topUp } = require('./utils/fork');
const {
    deployLiquityV2PaybackFromSPStrategy,
} = require('../test/utils-liquityV2');

async function main() {
    const isFork = true;
    const senderAcc = (await hre.ethers.getSigners())[0];
    // if (isFork) {
    //     await topUp(senderAcc.address);
    //     await topUp(getOwnerAddr());
    // }


    const paybackStrategyId = await deployLiquityV2PaybackFromSPStrategy(senderAcc, isFork);

    console.log(`Payback strategy id: ${paybackStrategyId}`);
    process.exit(0);
}

start(main);
