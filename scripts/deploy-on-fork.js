/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const fs = require('fs');
const { deployAsOwner } = require('./utils/deployer');
const { start } = require('./utils/starter');

const { changeConstantInFiles } = require('./utils/utils');

const { redeploy, OWNER_ACC } = require('../test/utils');

const { topUp } = require('./utils/fork.js');

const { createYearnRepayStrategy, createRariRepayStrategy, createMstableRepayStrategy } = require('../test/strategies');

const MAINNET_VAULT = '0xCCf3d848e08b94478Ed8f46fFead3008faF581fD';
const MAINNET_REGISTRY = '0xD5cec8F03f803A74B60A7603Ed13556279376b09';

async function main() {
    await topUp(OWNER_ACC);

    const signer = await hre.ethers.provider.getSigner(OWNER_ACC);
    const adminVault = await deployAsOwner('AdminVault', signer);

    await changeConstantInFiles(
        './contracts',
        ['MainnetAuthAddresses'],
        'ADMIN_VAULT_ADDR',
        adminVault.address,
    );

    await run('compile');

    const reg = await deployAsOwner('DFSRegistry', signer);

    await changeConstantInFiles(
        './contracts',
        ['MainnetActionsUtilAddresses', 'MainnetCoreAddresses'],
        'REGISTRY_ADDR',
        reg.address,
    );

    await run('compile');

    // core
    await redeploy('RecipeExecutor', reg.address);
    const strategyStorage = await redeploy('StrategyStorage', reg.address);
    const subStorage = await redeploy('SubStorage', reg.address);
    const bundleStorage = await redeploy('BundleStorage', reg.address);
    await redeploy('SubProxy', reg.address);
    await redeploy('StrategyProxy', reg.address);
    await redeploy('StrategyExecutor', reg.address);

    // mcd actions
    await redeploy('McdSupply', reg.address);
    await redeploy('McdWithdraw', reg.address);
    await redeploy('McdGenerate', reg.address);
    await redeploy('McdPayback', reg.address);
    await redeploy('McdOpen', reg.address);

    // exchange
    await redeploy('DFSSell', reg.address);

    const strategyTriggerView = await redeploy('StrategyTriggerView', reg.address);

    // mstable
    await redeploy('MStableDeposit', reg.address);
    await redeploy('MStableWithdraw', reg.address);

    // rari
    await redeploy('RariDeposit', reg.address);
    await redeploy('RariWithdraw', reg.address);

    // yearn
    await redeploy('YearnSupply', reg.address);
    await redeploy('YearnWithdraw', reg.address);

    await redeploy('McdView', reg.address);
    await redeploy('McdRatioTrigger', reg.address);

    // SS style strategies
    await strategyStorage.createStrategy(...(createYearnRepayStrategy()), true);
    await strategyStorage.createStrategy(...(createMstableRepayStrategy()), true);
    await strategyStorage.createStrategy(...(createRariRepayStrategy()), true);

    const strategyCount = await strategyStorage.getStrategyCount();

    console.log(`Created ${strategyCount.toString()} new strategies`);

    // switch back admin auth addr
    await changeConstantInFiles('./contracts', ['MainnetAuthAddresses'], 'ADMIN_VAULT_ADDR', MAINNET_VAULT);

    await changeConstantInFiles(
        './contracts',
        ['MainnetActionsUtilAddresses', 'MainnetCoreAddresses'],
        'REGISTRY_ADDR',
        MAINNET_REGISTRY,
    );

    await run('compile');

    const importantAddr = {
        DFSRegistry: reg.address,
        SubStorage: subStorage.address,
        BundleStorage: bundleStorage.address,
        StrategyStorage: strategyStorage.address,
        StrategyTriggerView: strategyTriggerView.address,
    };

    fs.writeFileSync('forked-addr.json', JSON.stringify(importantAddr));

    console.log('Contract addresses');
    console.log(`
        DFSRegistry: ${reg.address}
        SubStorage: ${subStorage.address}
        BundleStorage: ${bundleStorage.address}
        StrategyStorage: ${strategyStorage.address}
        StrategyTriggerView: ${strategyTriggerView.address}
    `);

    process.exit(0);
}

start(main);
