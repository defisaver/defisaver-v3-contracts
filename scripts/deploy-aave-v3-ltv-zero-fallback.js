const hre = require('hardhat');
const { topUp } = require('./utils/fork');
const { getOwnerAddr, redeploy, network } = require('../test/utils/utils');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    const aaveV3RatioCheck = await redeploy('AaveV3RatioCheck', true);
    const aaveV3RatioTrigger = await redeploy('AaveV3RatioTrigger', true);
    const strategyTriggerViewNoRevert = await redeploy('StrategyTriggerViewNoRevert', true);

    console.log('AaveV3RatioCheck:', aaveV3RatioCheck.address);
    console.log('AaveV3RatioTrigger:', aaveV3RatioTrigger.address);
    console.log('StrategyTriggerViewNoRevert:', strategyTriggerViewNoRevert.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
