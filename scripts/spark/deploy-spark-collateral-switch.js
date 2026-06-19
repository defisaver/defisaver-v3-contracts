const hre = require('hardhat');
const { topUp } = require('../utils/fork');
const { getOwnerAddr, network } = require('../../test/utils/utils');
const { deploySparkFLCollateralSwitchStrategy } = require('../../test/utils/spark');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    const strategyId = await deploySparkFLCollateralSwitchStrategy();
    console.log('Strategy ID:', strategyId);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
