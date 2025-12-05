const hre = require('hardhat');
const { topUp } = require('./utils/fork');
const { getOwnerAddr, redeploy, network } = require('../test/utils/utils');
const { deploySparkCloseGenericBundle } = require('../test/utils/spark');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    const sparkQuotePriceRangeTrigger = await redeploy('SparkQuotePriceRangeTrigger', true);
    console.log('SparkQuotePriceRangeTrigger:', sparkQuotePriceRangeTrigger.address);

    const closeBundle = await deploySparkCloseGenericBundle();
    console.log('Close bundle:', closeBundle);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
