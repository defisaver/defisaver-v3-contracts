const hre = require('hardhat');
const { topUp } = require('../utils/fork');
const { getOwnerAddr, network } = require('../../test/utils/utils');
const { deployAaveV3GenericFLDebtSwitchStrategy } = require('../../test/utils/aave');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    // Same generic strategy serves both wallet types, but it's registered under two ids.
    // Order matches automation-sdk: AAVE_V3_DEBT_SWITCH (SW) first, then AAVE_V3_DEBT_SWITCH_EOA.
    const swStrategyId = await deployAaveV3GenericFLDebtSwitchStrategy();
    const eoaStrategyId = await deployAaveV3GenericFLDebtSwitchStrategy();

    console.log('SW Strategy ID:', swStrategyId);
    console.log('EOA Strategy ID:', eoaStrategyId);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
