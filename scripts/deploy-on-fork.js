/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { deployAsOwner } = require('./utils/deployer');
const { start } = require('./utils/starter');

const { changeConstantInFiles } = require('./utils/utils');

const { redeploy, OWNER_ACC } = require('../test/utils');

const { topUp } = require('./utils/fork.js');

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
        ['MainnetActionsUtilAddresses'],
        'REGISTRY_ADDR',
        reg.address,
    );

    await run('compile');

    // core
    await redeploy('RecipeExecutor', reg.address);
    await redeploy('StrategyStorage', reg.address);
    await redeploy('SubStorage', reg.address);
    await redeploy('BundleStorage', reg.address);
    await redeploy('SubProxy', reg.address);
    await redeploy('StrategyProxy', reg.address);
    await redeploy('StrategyExecutor', reg.address);

    // actions
    // await redeploy('McdSupply', reg.address);
    // await redeploy('McdWithdraw', reg.address);
    // await redeploy('McdGenerate', reg.address);
    // await redeploy('McdPayback', reg.address);
    // await redeploy('McdOpen', reg.address);
    // await redeploy('McdGive', reg.address);
    // await redeploy('McdMerge', reg.address);

    // switch back admin auth addr
    await changeConstantInFiles('./contracts', ['MainnetAuthAddresses'], 'ADMIN_VAULT_ADDR', MAINNET_VAULT);

    await changeConstantInFiles(
        './contracts',
        ['MainnetActionsUtilAddresses'],
        'REGISTRY_ADDR',
        MAINNET_REGISTRY,
    );

    await run('compile');

    process.exit(0);
}

start(main);
