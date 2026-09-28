const hre = require('hardhat');
const { topUp } = require('./utils/fork');
const { getOwnerAddr, redeploy, network } = require('../test/utils/utils');

const CONTRACTS_PER_NETWORK = {
    mainnet: [
        'TriggerView',
        'AaveV3MinDebtTrigger',
        'AaveV4MinDebtTrigger',
        'CompV3MinDebtTrigger',
        'FluidMinDebtTrigger',
        'McdMinDebtTrigger',
        'MorphoBlueMinDebtTrigger',
        'SparkMinDebtTrigger',
        'RequiredAmountAndAllowanceTrigger',
    ],
    optimism: ['TriggerView', 'AaveV3MinDebtTrigger', 'RequiredAmountAndAllowanceTrigger'],
    arbitrum: [
        'TriggerView',
        'AaveV3MinDebtTrigger',
        'CompV3MinDebtTrigger',
        'FluidMinDebtTrigger',
        'MorphoBlueMinDebtTrigger',
        'RequiredAmountAndAllowanceTrigger',
    ],
    base: [
        'TriggerView',
        'AaveV3MinDebtTrigger',
        'CompV3MinDebtTrigger',
        'FluidMinDebtTrigger',
        'MorphoBlueMinDebtTrigger',
        'RequiredAmountAndAllowanceTrigger',
    ],
};

async function main() {
    const contracts = CONTRACTS_PER_NETWORK[network];

    if (!contracts) {
        throw new Error(`No TriggerView deployment list defined for network: ${network}`);
    }

    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);
    await topUp(getOwnerAddr(), network);

    console.log(`Deploying ${contracts.length} contracts on ${network}`);

    const deployed = {};

    // sequential on purpose, deploys share the owner account nonce
    for (const name of contracts) {
        const c = await redeploy(name, true);
        deployed[name] = c.address;
    }

    console.log('\nDeployed:');
    console.table(deployed);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
