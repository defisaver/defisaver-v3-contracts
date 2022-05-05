/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const fs = require('fs');
const { deployAsOwner } = require('./utils/deployer');
const { start } = require('./utils/starter');

const { changeConstantInFiles } = require('./utils/utils');

const { redeploy, OWNER_ACC } = require('../test/utils');

const { topUp } = require('./utils/fork.js');

const {
    createYearnRepayStrategy,
    createYearnRepayStrategyWithExchange,
    createRariRepayStrategy,
    createRariRepayStrategyWithExchange,
    createMstableRepayStrategy,
    createMstableRepayStrategyWithExchange,
} = require('../test/strategies');

const { addBotCaller } = require('../test/utils-strategies');

const MAINNET_VAULT = '0xCCf3d848e08b94478Ed8f46fFead3008faF581fD';
const MAINNET_REGISTRY = '0x287778F121F134C66212FB16c9b53eC991D32f5b';

const SUB_STORAGE_ADDR = '0x1612fc28Ee0AB882eC99842Cde0Fc77ff0691e90';
const BUNDLE_STORAGE_ADDR = '0x223c6aDE533851Df03219f6E3D8B763Bd47f84cf';
const STRATEGY_STORAGE_ADDR = '0xF52551F95ec4A2B4299DcC42fbbc576718Dbf933';
const RECIPE_EXECUTOR_ADDR = '0x1D6DEdb49AF91A11B5C5F34954FD3E8cC4f03A86';

const PROXY_AUTH_ADDR = '0x149667b6FAe2c63D1B4317C716b0D0e4d3E2bD70';

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
    const strategyStorage = await redeploy('StrategyStorage', reg.address);

    await changeConstantInFiles(
        './contracts',
        ['MainnetCoreAddresses'],
        'STRATEGY_STORAGE_ADDR',
        strategyStorage.address,
    );
    await run('compile');

    const bundleStorage = await redeploy('BundleStorage', reg.address);

    await changeConstantInFiles(
        './contracts',
        ['MainnetCoreAddresses'],
        'BUNDLE_STORAGE_ADDR',
        bundleStorage.address,
    );
    await run('compile');

    const subStorage = await redeploy('SubStorage', reg.address);

    const proxyAuth = await redeploy('ProxyAuth', reg.address);

    await changeConstantInFiles(
        './contracts',
        ['MainnetCoreAddresses'],
        'PROXY_AUTH_ADDR',
        proxyAuth.address,

    );
    await changeConstantInFiles(
        './contracts',
        ['MainnetCoreAddresses'],
        'SUB_STORAGE_ADDR',
        bundleStorage.address,
    );
    await run('compile');

    const recipeExecutor = await redeploy('RecipeExecutor', reg.address);
    await redeploy('SubProxy', reg.address);
    await redeploy('StrategyProxy', reg.address);

    await changeConstantInFiles(
        './contracts',
        ['StrategyExecutor'],
        'RECIPE_EXECUTOR_ADDR',
        bundleStorage.address,
    );
    await run('compile');

    const strategyExecutor = await redeploy('StrategyExecutor', reg.address);

    // mcd actions
    await redeploy('McdSupply', reg.address);
    await redeploy('McdWithdraw', reg.address);
    await redeploy('McdGenerate', reg.address);
    await redeploy('McdPayback', reg.address);
    await redeploy('McdOpen', reg.address);
    await redeploy('BotAuth', reg.address);
    await redeploy('GasFeeTaker', reg.address);

    await addBotCaller('0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4', reg.address);
    await addBotCaller('0x4E4cF1Cc07C7A1bA00740434004163ac2821efa7', reg.address);

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
    const rariView = await redeploy('RariView', reg.address);

    const yearnView = await redeploy('YearnView', reg.address);
    await redeploy('McdRatioTrigger', reg.address);

    // SS style strategies
    console.log(...(createYearnRepayStrategy()));
    await strategyStorage.createStrategy(...(createYearnRepayStrategy()), true);
    await strategyStorage.createStrategy(...(createYearnRepayStrategyWithExchange()), true);

    await strategyStorage.createStrategy(...(createMstableRepayStrategy()), true);
    await strategyStorage.createStrategy(...(createMstableRepayStrategyWithExchange()), true);

    await strategyStorage.createStrategy(...(createRariRepayStrategy()), true);
    await strategyStorage.createStrategy(...(createRariRepayStrategyWithExchange()), true);

    // bundles
    await bundleStorage.createBundle([0, 1]); // 0 bundle YEARN
    await bundleStorage.createBundle([2, 3]); // 1 bundle MSTABLE
    await bundleStorage.createBundle([4, 5]); // 2 bundle RARI

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

    await changeConstantInFiles(
        './contracts',
        ['MainnetCoreAddresses'],
        'SUB_STORAGE_ADDR',
        SUB_STORAGE_ADDR,

    );

    await changeConstantInFiles(
        './contracts',
        ['MainnetCoreAddresses'],
        'BUNDLE_STORAGE_ADDR',
        BUNDLE_STORAGE_ADDR,

    );

    await changeConstantInFiles(
        './contracts',
        ['MainnetCoreAddresses'],
        'STRATEGY_STORAGE_ADDR',
        STRATEGY_STORAGE_ADDR,

    );

    await changeConstantInFiles(
        './contracts',
        ['MainnetCoreAddresses'],
        'PROXY_AUTH_ADDR',
        PROXY_AUTH_ADDR,

    );

    await changeConstantInFiles(
        './contracts',
        ['StrategyExecutor'],
        'RECIPE_EXECUTOR_ADDR',
        RECIPE_EXECUTOR_ADDR,
    );

    await run('compile');

    const importantAddr = {
        DFSRegistry: reg.address,
        SubStorage: subStorage.address,
        BundleStorage: bundleStorage.address,
        StrategyStorage: strategyStorage.address,
        StrategyTriggerView: strategyTriggerView.address,
        StrategyExecutor: strategyExecutor.address,
        YearnView: yearnView.address,
        RariView: rariView.address,
    };

    fs.writeFileSync('forked-addr.json', JSON.stringify(importantAddr));

    console.log('Contract addresses');
    console.log(`
        DFSRegistry: ${reg.address}
        SubStorage: ${subStorage.address}
        BundleStorage: ${bundleStorage.address}
        StrategyStorage: ${strategyStorage.address}
        StrategyTriggerView: ${strategyTriggerView.address}
        YearnView: ${yearnView.address}
        StrategyExecutor: ${strategyExecutor.address}
        RariView: ${rariView.address},
    `);

    process.exit(0);
}

start(main);
