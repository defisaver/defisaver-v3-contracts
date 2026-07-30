const hre = require('hardhat');
const { topUp } = require('../utils/fork');
const { getOwnerAddr, network } = require('../../test/utils/utils');
const { deployMorphoBlueRepayOnPriceBundle } = require('../../test/utils/morpho-blue');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    const repayOnPriceBundle = await deployMorphoBlueRepayOnPriceBundle();
    console.log('Repay On Price Bundle:', repayOnPriceBundle);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
