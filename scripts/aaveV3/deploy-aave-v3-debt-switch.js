const hre = require('hardhat');
const { topUp } = require('../utils/fork');
const { getOwnerAddr, network } = require('../../test/utils/utils');
const { deployAaveV3FLDebtSwitchStrategy } = require('../../test/utils/aave');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    const strategyId = await deployAaveV3FLDebtSwitchStrategy();
    console.log('Strategy ID:', strategyId);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
