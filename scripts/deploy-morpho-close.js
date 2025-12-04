const hre = require('hardhat');
const { topUp } = require('./utils/fork');
const { getOwnerAddr, redeploy, network } = require('../test/utils/utils');
const { deployMorphoBlueCloseBundle } = require('../test/utils/morpho-blue');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    const morphoPriceRangeTrigger = await redeploy('MorphoBluePriceRangeTrigger', true);
    const closeBundle = await deployMorphoBlueCloseBundle();

    console.log('MorphoBluePriceRangeTrigger:', morphoPriceRangeTrigger.address);
    console.log('Close Bundle:', closeBundle);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
