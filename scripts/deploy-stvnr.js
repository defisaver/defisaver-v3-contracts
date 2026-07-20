const hre = require('hardhat');
const { topUp } = require('./utils/fork');
const { getOwnerAddr, redeploy, network } = require('../test/utils/utils');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    const stvnr = await redeploy('StrategyTriggerViewNoRevert', true);
    const fluidMinDebtChecker = await redeploy('FluidMinDebtTrigger', true);
    const aaveV3MinDebtChecker = await redeploy('AaveV3MinDebtTrigger', true);

    console.log('StrategyTriggerViewNoRevert:', stvnr.address);
    console.log('FluidMinDebtTrigger:', fluidMinDebtChecker.address);
    console.log('AaveV3MinDebtTrigger:', aaveV3MinDebtChecker.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
